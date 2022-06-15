require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const app = express();

app.use(express.json());

// Logic goes here
const User = require("./model/user");
const auth = require("./middleware/auth");

const nodemailer = require("nodemailer");
const excel = require("exceljs");

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    service: 'gmail',
    auth: {
        user:"amitkhemchand@gmail.com",
        pass:"xwpdrlrxcdyllcvn"
    },
})

// const statusCode = require("./helper/statuscode")

// Register
app.post("/register", async(req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;
        // Validate user input
        if (!(email && password && first_name && last_name)) {
            res.status(400).send("All input is required");
        }

        const oldUser = await User.findOne({ email });
        if (oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
        }
        encryptedPassword = await bcrypt.hash(password, 10);

         // Create user in our database
        const user = await User.create({
            first_name,
            last_name,
            email: email.toLowerCase(), // sanitize: convert email to lowercase
            password: encryptedPassword,
        });
        
        // Create token
        const token = jwt.sign(
            { user_id: user._id, email },
            process.env.TOKEN_KEY,
            {
            expiresIn: "2h",
            }
        );
        // save user token
        user.token = token;
            
        let message = {
            from: "amitkhemchand@gmail.com",
            to: req.body.email,
            subject: "Register Successfully",
            text: "Hello , You are Register Successfully.!!!"
        }
        transporter.sendMail(message, (err, data) => {
            if (err) {
                console.log(err)
                res.status(400).json({
                    status: 'fail Mail',
                })
            } else {
                console.log(data)
                // res.json({
                //     status: 'success',
                // })
                res.status(201).json(user);
            }
        })
        // return new user
        // res.status(201).json(user);
  
    } catch (err) {
         console.log(err);
    }

});
    
// Login
app.post("/login",async(req, res) => {
    try {
        // Get user input
        const { email, password } = req.body;
    
        // Validate user input
        if (!(email && password)) {
          res.status(400).send("All input is required");
        }
        // Validate if user exist in our database
        const user = await User.findOne({ email });
    
        if (user && (await bcrypt.compare(password, user.password))) {
          // Create token
          const token = jwt.sign(
            { user_id: user._id, email },
            process.env.TOKEN_KEY,
            {
              expiresIn: "2h",
            }
          );
    
          // save user token
          user.token = token;
    
          // user
          res.status(200).json(user);
        }
        else {
            res.status(400).send("Invalid Credentials");            
        }
      } catch (err) {
        console.log(err);
      }
    
});

app.get("/download", auth, async(req, res) => {
    try{
        const data = await User.find();
        let workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet("User");
        worksheet.columns = [
            { header:'id',key:'id',width:10},
            { header:'first_name',key:'first_name',width:10},
            { header:'last_name',key:'last_name',width:10},
            { header:'email',key:'email',width:10},
        ]

        let count =1
        data.forEach(user=>{
            user.id=count
            worksheet.addRow(user)
            count+= 1
        });


        const userData = await workbook.xlsx.writeFile('users.xlsx')
        res.status(200).send("done")
    } catch(e){
        console.error(e)
    }
});
    
module.exports = app;
