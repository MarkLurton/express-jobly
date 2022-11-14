"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "newJob",
    salary: 150000,
    equity: "0.4",
    companyHandle: "c3",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'newJob'`
    );
    expect(result.rows).toEqual([
      {
        title: "newJob",
        salary: 150000,
        equity: "0.4",
        companyHandle: "c3",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get("J1", "c1");
    expect(job).toEqual({
      title: "J1",
      salary: 60000,
      equity: "0.75",
      companyHandle: "c1",
    });
  });

  test("No match: not found error", async function () {
    try {
      let job = await Job.get("J1", "c2");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        title: "J1",
        salary: 60000,
        equity: "0.75",
        companyHandle: "c1",
      },
      {
        title: "J2",
        salary: 75000,
        equity: "0",
        companyHandle: "c2",
      },
      {
        title: "J3",
        salary: 125000,
        equity: "0.3",
        companyHandle: "c3",
      },
    ]);
  });
});

/************************************** findFiltered */

describe("findFiltered", function () {
  test("works: all filters", async function () {
    let filters = {
      title: "J",
      minSalary: 70000,
      hasEquity: true,
    };
    let jobs = await Job.findFiltered(filters);
    expect(jobs).toEqual([
      {
        title: "J3",
        salary: 125000,
        equity: "0.3",
        companyHandle: "c3",
      },
    ]);
  });

  test("works: minSalary filter", async function () {
    let filters = {
      minSalary: 70000,
    };
    let jobs = await Job.findFiltered(filters);
    expect(jobs).toEqual([
      {
        title: "J2",
        salary: 75000,
        equity: "0",
        companyHandle: "c2",
      },
      {
        title: "J3",
        salary: 125000,
        equity: "0.3",
        companyHandle: "c3",
      },
    ]);
  });

  test("works: hasEquity filter", async function () {
    let filters = {
      hasEquity: true,
    };
    let jobs = await Job.findFiltered(filters);
    expect(jobs).toEqual([
      {
        title: "J1",
        salary: 60000,
        equity: "0.75",
        companyHandle: "c1",
      },
      {
        title: "J3",
        salary: 125000,
        equity: "0.3",
        companyHandle: "c3",
      },
    ]);
  });

  test("works: title filter", async function () {
    let filters = {
      title: "J2",
    };
    let jobs = await Job.findFiltered(filters);
    expect(jobs).toEqual([
      {
        title: "J2",
        salary: 75000,
        equity: "0",
        companyHandle: "c2",
      },
    ]);
  });

  test("bad filter value", async function () {
    try {
      let filters = {
        thisShoudntWork: "please don't work",
      };
      let jobs = await Job.findFiltered(filters);
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    salary: 200000,
    equity: "0.1",
  };

  test("works", async function () {
    let job = await Job.update("J1", "c1", updateData);
    expect(job).toEqual({
      title: "J1",
      companyHandle: "c1",
      ...updateData,
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE company_handle = 'c1'
           AND title = 'J1'`
    );
    expect(result.rows).toEqual([
      {
        title: "J1",
        salary: 200000,
        equity: "0.1",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      salary: null,
      equity: null,
    };

    let company = await Job.update("J1", "c1", updateDataSetNulls);
    expect(company).toEqual({
      companyHandle: "c1",
      title: "J1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'J1'
           AND company_handle = 'c1'`
    );
    expect(result.rows).toEqual([
      {
        title: "J1",
        salary: null,
        equity: null,
        companyHandle: "c1",
      },
    ]);
  });

  test("not found if no such company", async function () {
    try {
      await Job.update("nope", "nada", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update("J1", "c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove("J1", "c1");
    const res = await db.query(
      `SELECT title FROM jobs 
       WHERE title = 'J1'
       AND company_handle = 'c1'`
    );
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Job.remove("nope", "nada");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
