const { BadRequestError } = require("../expressError");

// Function to handle partial update for either user or company.
// Takes data to update as well as an object that maps js variables to
// sql column names if needed. Returns an object containing the columns to be set as
// well as the values that they will be set too. Includes a check to ensure there actually is data.

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
