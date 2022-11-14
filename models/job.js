"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { title, salary, equity, companyHandle }
   *
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
      `SELECT title
           FROM jobs
           WHERE title = $1
           AND company_handle = $2`,
      [title, companyHandle]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(
        `Duplicate job: ${title} at company: ${companyHandle}`
      );
    }
    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, company_handle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           ORDER BY title`
    );
    return jobsRes.rows;
  }

  /**
   * Takes filters of title, minSalary, and hasEquity.
   *
   * Filtering by title will return only jobs that contain that substring
   * in their title.
   *
   * Filtering by minSalary will only return jobs that have a salary
   * greater than or equal to this number.
   *
   * Filtering by hasEquity will return jobs that have non-zero value for equity
   *
   */

  static async findFiltered(filters) {
    let jobsRes;
    const keys = Object.keys(filters);
    console.log(keys);
    for (let key of keys) {
      if (key != "title" && key != "minSalary" && key != "hasEquity") {
        throw new BadRequestError(
          `${key} is not a valid filter field. Please select filter of title, minSalary, or hasEquity.`
        );
      }
    }
    if (keys.length == 3) {
      let { title, minSalary, hasEquity } = filters;
      minSalary = Number(minSalary);
      if (hasEquity) {
        jobsRes = await db.query(
          `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE title ILIKE '%' || $1 || '%'
           AND salary >= $2
           AND equity != 0
           ORDER BY title`,
          [title, minSalary]
        );
      } else {
        jobsRes = await db.query(
          `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE title ILIKE '%' || $1 || '%'
           AND salary >= $2
           ORDER BY title`,
          [title, minSalary]
        );
      }
    } else if (keys.length == 2) {
      if (!keys.includes("title")) {
        let { minSalary, hasEquity } = filters;
        minSalary = Number(minSalary);

        if (hasEquity) {
          jobsRes = await db.query(
            `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE salary > $1
           AND equity != 0
           ORDER BY title`,
            [minSalary]
          );
        } else {
          jobsRes = await db.query(
            `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE salary > $1
           ORDER BY title`,
            [minSalary]
          );
        }
      } else if (!keys.includes("minSalary")) {
        let { title, hasEquity } = filters;
        if (hasEquity) {
          jobsRes = await db.query(
            `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE title ILIKE '%' || $1 || '%' 
           AND equity != 0
           ORDER BY title`,
            [title]
          );
        } else {
          jobsRes = await db.query(
            `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE title ILIKE '%' || $1 || '%' 
           AND equity != 0
           ORDER BY title`,
            [title]
          );
        }
      } else {
        let { title, minSalary } = filters;
        minSalary = Number(minSalary);
        jobsRes = await db.query(
          `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE title ILIKE '%' || $1 || '%' 
           AND salary >= $2
           ORDER BY title`,
          [title, minSalary]
        );
      }
    } else {
      if (keys[0] == "title") {
        jobsRes = await db.query(
          `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE title ILIKE '%' || $1 || '%' 
           ORDER BY title`,
          [filters["title"]]
        );
      } else if (keys[0] == "minSalary") {
        let { minSalary } = filters;
        minSalary = Number(minSalary);
        jobsRes = await db.query(
          `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE salary >= $1
           ORDER BY title`,
          [minSalary]
        );
      } else {
        let { hasEquity } = filters;
        if (hasEquity) {
          jobsRes = await db.query(
            `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE equity != 0
           ORDER BY title`
          );
        } else {
          jobsRes = await db.query(
            `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
            FROM jobs
            ORDER BY title`
          );
        }
      }
    }
    return jobsRes.rows;
  }

  /** Given a job title and company handle, return data about job.
   *
   * Returns { title, salary, equity,companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(title, companyHandle) {
    const jobRes = await db.query(
      `SELECT title,
                  salary,
                  equity,
                  company_Handle as "companyHandle"
           FROM jobs
           WHERE title = $1
           AND company_handle = $2
           LIMIT 1`,
      [title, companyHandle]
    );

    const job = jobRes.rows[0];

    if (!job)
      throw new NotFoundError(`No job: ${title} at company: ${companyHandle}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {tile, salary, equity}
   *
   * Returns {title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(title, companyHandle, data) {
    if (Object.keys(data).includes("companyHandle")) {
      throw new BadRequestError("Error: cannot change company handle");
    }
    const { setCols, values } = sqlForPartialUpdate(data, {
      title: "title",
      salary: "salary",
      equity: "equity",
    });
    const titleVarIdx = "$" + (values.length + 1);
    const companyHandleVarIdx = "$" + (values.length + 2);

    const querySql = `UPDATE jobs
                      SET ${setCols} 
                      WHERE title = ${titleVarIdx}
                      AND company_handle = ${companyHandleVarIdx}
                      RETURNING title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, title, companyHandle]);
    const job = result.rows[0];

    if (!job)
      throw new NotFoundError(`No job: ${title} at company: ${companyHandle}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(title, companyHandle) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE title = $1
           AND company_handle = $2
           RETURNING title`,
      [title, companyHandle]
    );
    const job = result.rows[0];

    if (!job)
      throw new NotFoundError(`No job: ${title} at company: ${companyHandle}`);
  }
}

module.exports = Job;
