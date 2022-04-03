process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../app");
const db = require('../db');

let apple = { code: "apple", name: "Apple", description: "apple company" };
let invoice = { comp_code: "apple", amt: 20 };

beforeEach(async function () {
    //init the test data
    await db.query('DELETE FROM companies');
    await db.query('DELETE FROM invoices');

    await db.query('INSERT INTO companies VALUES ($1 , $2 , $3)', [apple.code, apple.name, apple.description]);
    const result = await db.query(`INSERT INTO invoices (comp_code , amt) VALUES ($1 , $2) 
            RETURNING id, amt, paid, add_date, paid_date, comp_code`, [invoice.comp_code, invoice.amt]);
    invoice = result.rows[0];

});

afterEach(async function () {
    // clear the data
    await db.query('DELETE FROM companies');

});


afterAll(async function () {
    await db.end();
});


/** 
 * GET /invoices - 
 * returns `{invoices : [{id , comp_code}]}` 
 * */

describe("GET /invoices", function () {
    test("Gets a list of invoices", async function () {
        const resp = await request(app).get(`/invoices`);
        expect(resp.statusCode).toBe(200);

        expect(resp.body).toEqual({
            invoices: [{
                "id": expect.any(Number),
                "comp_code": apple.code
            }]
        });
    });
});

//end


/** 
 * GET /invoices/[code] - 
 * return data about one invoice: `{invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}}` 
 * */

describe("GET /invoices/:id", function () {
    test("Gets a single invoice", async function () {
        const url = `/invoices/${invoice.id}`;
        const resp = await request(app).get(url);
        expect(resp.statusCode).toBe(200);

        expect(resp.body).toEqual({
            invoice: {
                id: invoice.id,
                add_date: invoice.add_date.toISOString(),
                amt: invoice.amt,
                paid: invoice.paid,
                paid_date: invoice.paid_date,
                company: apple
            }
        });
    });

    test("Responds with 404 if can't find invoice", async function () {
        const resp = await request(app).get(`/invoices/0`);
        expect(resp.statusCode).toBe(404);
    });
});
// end


/** 
 * POST /invoices - create invoice from data; 
 * return `{invoice: {id, comp_code, amt, paid, add_date, paid_date}}` */

describe("POST /invoices", function () {
    test("Creates a new invoice", async function () {
        const resp = await request(app)
            .post(`/invoices`)
            .send({
                comp_code: apple.code,
                amt: 100
            });
        expect(resp.statusCode).toBe(201);
        expect(resp.body).toEqual({
            "invoice": {
                id: expect.any(Number),
                comp_code: apple.code,
                amt: 100,
                paid: false,
                add_date: (new Date((new Date()).toDateString())).toISOString(),
                paid_date: null
            }
        });
    });


    test("Creates a new invoice, no comp_code", async function () {
        const resp = await request(app)
            .post(`/invoices`)
            .send({
                comp_code: "",
                amt: 20
            });
        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({
            "error": {
                message: "comp_code and amt are required",
                status: 400
            },
            "message": "comp_code and amt are required"
        });
    });


    test("Creates a new invoice, amt = 0", async function () {
        const resp = await request(app)
            .post(`/invoices`)
            .send({
                comp_code: "apple",
                amt: 0
            });
        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({
            "error": {
                message: "amt must be greater than 0",
                status: 400
            },
            "message": "amt must be greater than 0"
        });
    });


    test("Creates a new invoice, comp_code not exist", async function () {
        const resp = await request(app)
            .post(`/invoices`)
            .send({
                comp_code: "0",
                amt: 234
            });
        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({
            "error": {
                message: "company with code 0 can not be found",
                status: 400
            },
            "message": "company with code 0 can not be found"
        });
    });
});
// end

/** 
 * PUT /invoices/[name] - update invoice; 
 * return `{invoice: {id, comp_code, amt, paid, add_date, paid_date}}` */

describe("PUT /invoices/:name", function () {
    test("Updates a single invoice , paid", async function () {
        const resp = await request(app)
            .put(`/invoices/${invoice.id}`)
            .send({
                amt: 20.20,
                paid: true
            });
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            "invoice": {
                id: invoice.id,
                comp_code: apple.code,
                amt: 20.20,
                paid: true,
                add_date: invoice.add_date.toISOString(),
                paid_date: expect.any(String)
            }
        });
    });


    test("Updates a single invoice , unpaid", async function () {
        const resp = await request(app)
            .put(`/invoices/${invoice.id}`)
            .send({
                amt: 20.20,
                paid: false
            });
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            "invoice": {
                id: invoice.id,
                comp_code: apple.code,
                amt: 20.20,
                paid: false,
                add_date: invoice.add_date.toISOString(),
                paid_date: null
            }
        });
    });

    test("update a single invoice, no amt", async function () {
        const resp = await request(app)
            .put(`/invoices/${invoice.id}`)
            .send({
            });
        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({
            "error": {
                message: "amt is required",
                status: 400
            },
            "message": "amt is required"
        });
    });

    test("update a single invoice, amt <= 0", async function () {
        const resp = await request(app)
            .put(`/invoices/${invoice.id}`)
            .send({
                amt : 0
            });
        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({
            "error": {
                message: "amt must be greater than 0",
                status: 400
            },
            "message": "amt must be greater than 0"
        });
    });

    test("Responds with 404 if id invalid", async function () {
        const resp = await request(app).patch(`/invoices/0`);
        expect(resp.statusCode).toBe(404);
    });
});
// end

/** DELETE /invoices/[id] - delete invoice,
 *  return `{status: "deleted"}` */

describe("DELETE /invoices/:id", function () {
    test("Deletes a single a invoice", async function () {
        const resp = await request(app).delete(`/invoices/${invoice.id}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({ status: "deleted" });

        // already deleted returns 404
        const resp1 = await request(app).delete(`/invoices/${invoice.id}`);
        expect(resp1.statusCode).toBe(404);
    });
});
  // end