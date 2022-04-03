process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../app");
const db = require('../db');

let it = { code: "it", industry: "IT" };
let apple = { code: "apple", name: "Apple", description: "apple company", industries: ["it"] };
let invoice = { comp_code: "apple", amt: 20 };

beforeEach(async function () {
    //init the test data
    await db.query('DELETE FROM companies');
    await db.query('DELETE FROM industries');

    await db.query('INSERT INTO industries VALUES ($1 , $2)', [it.code, it.industry]);
    await db.query('INSERT INTO companies VALUES ($1 , $2 , $3)', [apple.code, apple.name, apple.description]);
    await db.query('INSERT INTO companies_industries VALUES ($1 , $2)', [apple.code, it.code]);
    await db.query('INSERT INTO invoices (comp_code , amt) VALUES ($1 , $2)', [invoice.comp_code, invoice.amt]);

});

afterEach(async function () {
    // clear the data
    await db.query('DELETE FROM companies');
    await db.query('DELETE FROM industries');

});


afterAll(async function () {
    await db.end();
});



/** 
 * GET /industries - 
 * returns `{industries : [{"code": "it" , "name": "IT"}]}` 
 * */

describe("GET /industries", function () {
    test("Gets a list of industries", async function () {
        const resp = await request(app).get(`/industries`);
        expect(resp.statusCode).toBe(200);

        expect(resp.body).toEqual({
            industries: [{
                code: it.code,
                industry: it.industry,
                companies: [
                    {
                        code: apple.code,
                        name: apple.name
                    }
                ]
            }]
        });
    });
});

//end


/** 
 * GET /industries/[code] - 
 * return data about one industry: `{industry: {code, industry , companies: [{code , name} , ...]}}` 
 * */

describe("GET /industries/:code", function () {
    test("Gets a single industry", async function () {
        const resp = await request(app).get(`/industries/${it.code}`);
        expect(resp.statusCode).toBe(200);

        expect(resp.body).toEqual({
            industry: {
                code: it.code,
                industry: it.industry,
                companies: [
                    {
                        code: apple.code,
                        name: apple.name
                    }
                ]
            }
        });
    });

    test("Responds with 404 if can't find industry", async function () {
        const resp = await request(app).get(`/industries/0`);
        expect(resp.statusCode).toBe(404);
    });
});
// end


/** 
 * POST /industries - create industry from data; 
 * return `{industry: {code, industry}}` */

describe("POST /industries", function () {
    test("Creates a new industry", async function () {
        const resp = await request(app)
            .post(`/industries`)
            .send({
                industry : "Accounting"
            });
        expect(resp.statusCode).toBe(201);
        expect(resp.body).toEqual({
            "industry": {
                code: "accounting",
                industry: "Accounting"
            }
        });
    });


    test("Creates a new company, no name", async function () {
        const resp = await request(app)
            .post(`/industries`)
            .send({
                industry: ""
            });
        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({
            "error": {
                message: "industry is required",
                status: 400
            },
            "message": "industry is required"
        });
    });
});
// end

/** 
 * PUT /industries/[name] - update industry; 
 * return `{industry: {code, industry}}` */

describe("PUT /industries/:name", function () {
    test("Updates a single industry", async function () {
        const resp = await request(app)
            .put(`/industries/${it.code}`)
            .send({
                industry: "It Updated"
            });
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            industry: {
                code: it.code,
                industry: "It Updated"
            }
        });
    });

    test("update a single industry, no name", async function () {
        const resp = await request(app)
            .put(`/industries/${it.code}`)
            .send({
                name: ""
            });
        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({
            "error": {
                message: "industry is required",
                status: 400
            },
            "message": "industry is required"
        });
    });

    test("Responds with 404 if id invalid", async function () {
        const resp = await request(app).patch(`/industries/0`);
        expect(resp.statusCode).toBe(404);
    });
});
// end

/** DELETE /industries/[name] - delete industry,
 *  return `{status: "deleted"}` */

describe("DELETE /industries/:name", function () {
    test("Deletes a single a industry", async function () {
        const resp = await request(app).delete(`/industries/${it.code}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({ status: "deleted" });

        // already deleted returns 404
        const resp1 = await request(app).delete(`/industries/${it.code}`);
        expect(resp1.statusCode).toBe(404);
    });
});
  // end