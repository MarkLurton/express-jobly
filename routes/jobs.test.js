"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /jobs", function () {
  const newJob = {
    title: "testJob",
    salary: 150000,
    equity: "0.25",
    companyHandle: "c3",
  };

  test("ok for users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: newJob,
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "newJob",
        salary: 100000,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        salary: -100,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
          title: "test",
          salary: 125000,
          equity: "0.2",
          companyHandle: "c3",
        },
        {
          title: "test2",
          salary: 75000,
          equity: "0.6",
          companyHandle: "c2",
        },
        {
          title: "test3",
          salary: 76000,
          equity: "0",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("bad filter value", async function () {
    try {
      let filters = {
        thisShoudntWork: "please don't work",
      };
      const resp = await request(app).get("/jobs?badfilter=shouldntwork");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:title/:companyHandle */

describe("GET /jobs/:title/:companyHandle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/test2/c2`);
    expect(resp.body).toEqual({
      job: {
        title: "test2",
        salary: 75000,
        equity: "0.6",
        companyHandle: "c2",
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/jobs/test2/c3`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:title/:companyHandle */

describe("PATCH /jobs/:title/:companyHandle", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .patch(`/jobs/test2/c2`)
      .send({
        title: "test2-new",
        salary: 80000,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        title: "test2-new",
        salary: 80000,
        equity: "0.6",
        companyHandle: "c2",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/jobs/test3/c1`).send({
      title: "test3-new",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/test3/c2`)
      .send({
        title: "new nope",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on company handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/jobs/test3/c1`)
      .send({
        companyHandle: "c1-new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/test2/c2`)
      .send({
        salary: -1000,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:title/:companyHandle */

describe("DELETE /jobs/:title/:companyHandle", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .delete(`/jobs/test/c3`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      deleted: "test at c3",
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/jobs/test/c3`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/jobs/test/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
