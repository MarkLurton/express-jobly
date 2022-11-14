"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();

/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    let jobs;
    console.log(req.query);
    if (Object.keys(req.query).length == 0) {
      jobs = await Job.findAll();
    } else {
      jobs = await Job.findFiltered(req.query);
    }
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:title/:companyHandle", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.title, req.params.companyHandle);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login
 */

router.patch(
  "/:title/:companyHandle",
  ensureAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const job = await Job.update(
        req.params.title,
        req.params.companyHandle,
        req.body
      );
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login
 */

router.delete(
  "/:title/:companyHandle",
  ensureAdmin,
  async function (req, res, next) {
    try {
      await Job.remove(req.params.title, req.params.companyHandle);
      return res.json({
        deleted: `${req.params.title} at ${req.params.companyHandle}`,
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
