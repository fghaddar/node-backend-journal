const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sql = require('mysql');
const pool = require("./dbPools");
const { application } = require('express');

const app = express();
app.set("view engine", "ejs");
app.use(session( {
    secret: 'top secret!',
    resave: true,
    saveUninitialized: true
}));
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));

// **** routes ****
app.get("/", (req, res) => {
    res.render("index");
});

app.post("/", async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let hashedPwd = "";
    let sql = `SELECT * FROM authentication WHERE username = ?`
    let rows = await executeSQL(sql, [username]);

    console.log("username:" + username);
    console.log("password: " + password);
    console.log("hashedPassword: " + hashedPwd);

    if (rows.length > 0) {
        hashedPwd = rows[0].password;
    }

    let passwordMatch = await bcrypt.compare(password, hashedPwd);
    console.log("passwordMatch: " + passwordMatch);

    if (passwordMatch) {
        req.session.authenticated = true;
        res.redirect('/home');
    }
    else
        res.render('index', {"loginError": true});
});

app.get("/register", (req, res) => {
    res.render('register');
});

app.post("/register", async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let hashedPwd = await bcrypt.hash(password, 10);
    let sql =  `INSERT INTO authentication (username, password) VALUES (?, ?)`;
    let rows = await executeSQL(sql, [username, hashedPwd]);
    res.redirect("/");
});

app.get("/logout", isAuthenticated, (req,res) => {
    req.session.destroy();
    res.redirect("/");
});

app.get("/home", isAuthenticated, (req, res) => {
    res.redirect("/quotes");
});

app.get("/quoteFinder", isAuthenticated, async (req, res) => {
    let sql = `SELECT authorId, firstName, lastName FROM q_authors`;
    let authors = await executeSQL(sql);
    sql =  `SELECT DISTINCT category FROM q_quotes`;
    let categories = await executeSQL(sql);
    res.render("quoteFinder", {"authors": authors, "categories": categories});
});

app.get('/searchByKeyword', isAuthenticated, async (req, res) => {
    let keyword = req.query.keyword;
    let sql = ` SELECT quote, authorId, firstName, lastName
                FROM q_quotes
                NATURAL JOIN q_authors
                WHERE quote LIKE ? `;
    let params = [`%${keyword}%`]
    let rows = await executeSQL(sql, params);
    sql = ` SELECT * FROM q_authors`;
    let authors = await executeSQL(sql);
    res.render('quotes', {"quotes": rows, "authors": authors});
});

app.get('/searchByAuthor', isAuthenticated, async (req, res) => {
    let author = req.query.authorId;
    let sql = ` SELECT quote, authorId, firstName, lastName
                FROM q_quotes
                NATURAL JOIN q_authors
                WHERE authorId LIKE ? `;
    let params = [author];
    let rows = await executeSQL(sql, params);
    sql = ` SELECT * FROM q_authors`;
    let authors = await executeSQL(sql);
    res.render('quotes', {"quotes": rows, "authors": authors});
});

app.get('/api/authors', isAuthenticated, async (req, res) => {
    let sql = ` SELECT * FROM q_authors`;
    let rows = await executeSQL(sql);
    res.send(rows);
});

app.get('/api/author/:id', isAuthenticated, async (req, res) => {
    let id = req.params.id;
    let sql = ` SELECT * 
                FROM q_authors
                WHERE authorId = ?`
    let params = [id];
    let rows = await executeSQL(sql, params);
    res.send(rows);
});

app.get('/api/quote/:id', isAuthenticated, async (req, res) => {
    let id = req.params.id;
    let sql = ` SELECT * 
                FROM q_quotes
                WHERE quoteId = ?`
    let params = [id];
    let rows = await executeSQL(sql, params);
    res.send(rows);
});

app.get('/api/categories', isAuthenticated, async (req, res) => {
    let sql = ` SELECT DISTINCT category FROM q_quotes`;
    let rows = await executeSQL(sql);
    res.send(rows);
});

app.get('/searchByCategory', isAuthenticated, async (req, res) => {
    let sql =   `SELECT quote, authorId, firstName, lastName
                 FROM q_quotes
                 NATURAL JOIN q_authors
                 WHERE category = ? `
    let params = [req.query.category];
    let rows = await executeSQL(sql, params);
    res.render('results', {"quotes": rows});
});

app.get('/searchByLikes', isAuthenticated, async (req, res) => {
    let sql =   ` SELECT quote, authorId, firstName, lastName
                  FROM q_quotes
                  NATURAL JOIN q_authors
                  WHERE likes > ? AND likes < ?`
    let lowerBound = req.query.lowerRange;
    let upperBound = req.query.upperRange;
    let params = [lowerBound, upperBound];
    let rows = await executeSQL(sql, params);
    res.render('results', {"quotes": rows});
});

app.get("/quotes", isAuthenticated, async (req, res) => {
    let sql =   `SELECT quoteId, quote, authorId, firstName, lastName
                FROM q_quotes NATURAL JOIN q_authors`;
    let rows = await executeSQL(sql);
    sql = ` SELECT * FROM q_authors`;
    let authors = await executeSQL(sql);
    res.render('quotes', {"quotes": rows, "authors": authors});
});

app.get("/quote/new", isAuthenticated, async (req, res) => {
    let sql = `SELECT authorId, firstName, lastName FROM q_authors`;
    let authors = await executeSQL(sql);
    sql =  `SELECT DISTINCT category FROM q_quotes`;
    let categories = await executeSQL(sql);
    res.render('newQuote', {"authors": authors, "categories": categories});
});

app.post("/quote/new", isAuthenticated, async (req, res) => {
    let sql = `INSERT INTO q_quotes (quote, authorId, category, likes) VALUES (?, ?, "Life", 1)`;
    let params = [req.body.quote, req.body.authorId];
    let rows = await executeSQL(sql, params);
    res.redirect('/quotes');
});

app.get("/quotes/delete", isAuthenticated, async (req, res) => {
    let sql = `DELETE FROM q_quotes WHERE quoteId = ${req.query.quoteId}`;
    let rows = await executeSQL(sql);
    res.redirect('/quotes');
});

app.get("/quotes/edit", isAuthenticated, async (req, res) => {
    let quoteId = req.query.quoteId;
    let sql =   `SELECT quoteId, quote, category, likes FROM q_quotes WHERE quoteId = ${quoteId} `;
    let quote = await executeSQL(sql);
    sql = `SELECT DISTINCT category FROM q_quotes`;
    let categories = await executeSQL(sql);
    res.render('editQuote', {"quote": quote, "categories":categories, "category": quote[0].category});
});

app.post("/quotes/edit", isAuthenticated, async (req, res) => {
    let sql = `UPDATE q_quotes SET quote = ?, category = ?, likes = ? WHERE quoteId = ?`;
    let params = [req.body.quote, req.body.category, req.body.likes, req.body.quoteId];
    let rows = await executeSQL(sql, params);
    res.redirect('/quotes');
});

// **** functions ****
async function executeSQL(sql, params) {
    return new Promise (function (resolve, reject) {
      pool.query(sql, params, function (err, rows, fields) {
      if (err) throw err;
        resolve(rows);
      });
    });
}

function isAuthenticated(req, res, next) {
    if (! req.session.authenticated) {
        res.redirect("/");
    }
    else {
        next();
    }
}

// **** listeners ****
app.listen(3000, '127.0.0.1', () => {
    console.log("server started");
});