const express = require("express");
const ExpressError = require("../expressError")
const db = require("../db");

let router = new express.Router();


router.get("/", async function (req, res, next) {
  try {
    const result = await db.query(
          `SELECT id, comp_code
           FROM invoices 
           ORDER BY id`
    );

    return res.json({"invoices": result.rows});
  }

  catch (err) {
    return next(err);
  }
});


router.get("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;

    const result = await db.query(
          `SELECT i.id, 
                  i.comp_code, 
                  i.amt, 
                  i.paid, 
                  i.add_date, 
                  i.paid_date, 
                  c.name, 
                  c.description 
           FROM invoices AS i
             INNER JOIN companies AS c ON (i.comp_code = c.code)  
           WHERE id = $1`,
        [id]);

    if (result.rows.length === 0) {
      throw new ExpressError(`No such invoice: ${id}`,404);
    }

    const data = result.rows[0];
    const invoice = {
      id: data.id,
      company: {
        code: data.comp_code,
        name: data.name,
        description: data.description,
      },
      amt: data.amt,
      paid: data.paid,
      add_date: data.add_date,
      paid_date: data.paid_date,
    };

    return res.json({"invoice": invoice});
  }

  catch (err) {
    return next(err);
  }
});


router.post('/', async (req, res, next) => {
  try {

      if (req.body.comp_code === undefined ||
          req.body.amt === undefined ||
          req.body.comp_code.length === 0) {
          throw new ExpressError('comp_code and amt are required', 400);
      }

      const amt = Number(req.body.amt);

      if (amt === NaN || amt <= 0) {
          throw new ExpressError('amt must be greater than 0', 400);
      }

      const company = await db.query('SELECT code FROM companies WHERE code = $1', [req.body.comp_code]);

      if (company.rows.length === 0) {
          throw new ExpressError(`company with code ${req.body.comp_code} can not be found`, 400);

      }

      const results = await db.query(
          `
          INSERT INTO invoices 
              (comp_code , amt) 
          VALUES 
              ($1 , $2)
          RETURNING id, comp_code, amt, paid, add_date, paid_date` ,
          [req.body.comp_code, req.body.amt]);

      return res.status(201).json({ invoice: results.rows[0] });
  } catch (err) {
      next(err);
  }
});


router.put('/:id', async (req, res, next) => {
  try {

      if (req.body.amt === undefined){
          throw new ExpressError('amt is required', 400);
      }
      const amt = Number(req.body.amt);

      if (amt === NaN || amt <= 0) {
          throw new ExpressError('amt must be greater than 0', 400);
      }

      const results = await db.query(
          `
          UPDATE invoices 
          SET
              amt = $2
          WHERE
              id = $1
          RETURNING id, comp_code, amt, paid, add_date, paid_date` ,
          [req.params.id, req.body.amt]);

      if (results.rows.length === 0) {
          throw new ExpressError(`invoice with id ${req.params.id} can not be found`, 404);
      }


      if (req.body.paid !== undefined) {
          if (req.body.paid === true || req.body.paid === false) {
              //only set paid to true or false would update the paid_date

              const paid = req.body.paid === true ? true : false;
              const paidDate = paid ? (new Date()).toISOString().substr(0, 10) : null;

              const results = await db.query(`
              UPDATE invoices 
              SET
                  paid = $2,
                  paid_date = $3
              WHERE
                  id = $1
              RETURNING id, comp_code, amt, paid, add_date, paid_date` ,
                  [req.params.id, paid , paidDate]);

              return res.json({ invoice: results.rows[0] });
          }
      }

      return res.json({ invoice: results.rows[0] });
  } catch (err) {
      next(err);
  }
});


router.delete('/:id', async (req, res, next) => {
  try {
      const results = await db.query(
          `DELETE FROM invoices WHERE id = $1
           RETURNING id`,
          [req.params.id]);

      if (results.rows.length === 0) {
          throw new ExpressError(`invoice with id ${req.params.id} can not be found`, 404);
      }

      return res.json({ status: "deleted" });
  } catch (err) {
      next(err);
  }
});


module.exports = router;