"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`
    );

    return companiesRes.rows;
  }

  /**
   * Takes filters of compnayName, minEmployees, and maxEmployees.
   *
   * Filtering by companyName will return only companies that contain that substring
   * in their name.
   *
   * Filtering by minEmployees will only return companies that have
   * greater than or equal to this number of Employees.
   *
   * Filtering by maxEmployees will only return companies that have
   * less than or equal to this number of Employees.
   *
   * Having a minEmployee filter greater than maxEmployee will return
   * a bad request error.
   */

  static async findFiltered(filters) {
    let companiesRes;
    const keys = Object.keys(filters);
    console.log(keys);
    if (keys.length == 3) {
      let { companyName, minEmployees, maxEmployees } = filters;
      minEmployees = Number(minEmployees);
      maxEmployees = Number(maxEmployees);
      if (minEmployees > maxEmployees) {
        throw new BadRequestError(
          `minEmployees (${minEmployees}) greater than maxEmployees (${maxEmployees})`
        );
      }
      companiesRes = await db.query(
        `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE name ILIKE '%' || $1 || '%'
           AND num_employees BETWEEN $2 AND $3
           ORDER BY name`,
        [companyName, minEmployees, maxEmployees]
      );
    } else if (keys.length == 2) {
      if (!keys.includes("companyName")) {
        let { minEmployees, maxEmployees } = filters;
        minEmployees = Number(minEmployees);
        maxEmployees = Number(maxEmployees);
        if (minEmployees > maxEmployees) {
          throw new BadRequestError(
            `minEmployees (${minEmployees}) greater than maxEmployees (${maxEmployees})`
          );
        }

        companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE numEmployees BETWEEN $1 AND $2
           ORDER BY name`,
          [minEmployees, maxEmployees]
        );
      } else if (!keys.includes("minEmployees")) {
        let { companyName, maxEmployees } = filters;
        maxEmployees = Number(maxEmployees);
        companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE name ILIKE '%' || $1 || '%' 
           AND numEmployees <= $2
           ORDER BY name`,
          [companyName, maxEmployees]
        );
      } else {
        let { companyName, minEmployees } = filters;
        minEmployees = Number(minEmployees);
        companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE name ILIKE '%' || $1 || '%' 
           AND numEmployees >= $2
           ORDER BY name`,
          [companyName, minEmployees]
        );
      }
    } else {
      if (keys[0] == "companyName") {
        companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE name ILIKE '%' || $1 || '%' 
           ORDER BY name`,
          [filters["companyName"]]
        );
      } else if (keys[0] == "minEmployees") {
        let { minEmployees } = filters;
        minEmployees = Number(minEmployees);
        companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE num_employees >= $1
           ORDER BY name`,
          [minEmployees]
        );
      } else {
        let { maxEmployees } = filters;
        maxEmployees = Number(maxEmployees);
        companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE num_employees <= $1
           ORDER BY name`,
          [maxEmployees]
        );
      }
    }
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    const jobsRes = await db.query(
      `SELECT title,
              salary,
              equity
      FROM jobs
      WHERE company_handle = $1`,
      [handle]
    );

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    company.jobs = jobsRes.rows;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
