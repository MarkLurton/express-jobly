const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartailUpdate", function () {
  test("works", function () {
    const data = {
      firstName: "test",
      lastName: "test",
      isAdmin: false,
    };
    const result = sqlForPartialUpdate(data, {
      firstName: "first_name",
      lastName: "last_name",
      isAdmin: "is_admin",
    });
    expect(result.setCols).toEqual(
      '"first_name"=$1, "last_name"=$2, "is_admin"=$3'
    );
    expect(result.values).toEqual(["test", "test", false]);
  });
  test("throws error if no data", function () {
    try {
      const data = {};
      const result = sqlForPartialUpdate(data, {
        firstName: "first_name",
        lastName: "last_name",
        isAdmin: "is_admin",
      });
    } catch (err) {
      expect(err instanceof BadRequestError).toEqual(true);
    }
  });
});
