const slugify = require('slugify');

/**
 * Return the slug of provided name
 * @param {*} name 
 * @returns 
 */
function slugifyCode(name) {
    return slugify(name, {
        replacement: '-',  // replace spaces with replacement character, defaults to `-`
        remove: /[*+~.()'"!:@]/g, // remove characters that match regex, defaults to `undefined`
        lower: true,      // convert to lower case, defaults to `false`
        strict: true     // strip special characters except replacement, defaults to `false`
    });
}

/**
 * Set the industries of a company
 * @param {*} db 
 * @param {*} comp_code 
 * @param {*} indu_codes 
 * @returns 
 */
async function setIndustries(db, comp_code, indu_codes) {
    const result = await db.query('DELETE FROM companies_industries WHERE comp_code = $1', [comp_code]);

    if (indu_codes !== undefined && indu_codes.length > 0) {
        const values = indu_codes.map((code, index) => `($1 , $${index + 2})`).join(',');

        const results = await db.query(`INSERT INTO companies_industries VALUES ${values} 
            RETURNING indu_code` , [comp_code, ...indu_codes]);

        return results.rows.map(r => r.indu_code);
    }
    return [];
}

module.exports = {
    slugifyCode: slugifyCode,
    setIndustries: setIndustries
}