const mysql = require('mysql');

const pool  = mysql.createPool({
    connectionLimit: 10,
    host: "yjo6uubt3u5c16az.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "uxyhgokmwcqjduk5",
    password: "swyrisae1etz6fyd",
    database: "ntz8eyajd2ecqvj6"
});

module.exports = pool;