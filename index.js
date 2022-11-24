const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const userModel = require("./model");
const bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");

const nodemailer = require("nodemailer");

const { google } = require("googleapis");

require("dotenv").config();

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.CLIENT_ID, // ClientID
  process.env.CLIENT_SECRET, // Client Secret
  process.env.REDIRECT_URL // Redirect URL
);

oauth2Client.setCredentials({
  refresh_token:process.env.REFRESH_TOKEN,
});
const accessToken = oauth2Client.getAccessToken();

let generator = require('generate-password');



//CORS
const cors = require("cors");

app.use(
  cors({
    origin: "*",
  })
);


require("./database").connect();

const PORT =  process.env.port || 4000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.post("/signup", async function (req, res) {
  try {
    let { email, password, mobile, name, place } = req.body;

    if (!email || typeof email !== "string" || !email.length) {
      return res.status(422).send({ message: "Invalid Email!" });
    }

    if (
      !password ||
      typeof password !== "string" ||
      password.length < 8 ||
      !password.length
    ) {
      return res.status(422).send({ message: "Invalid Password!" });
    }

    if (!mobile || typeof mobile !== "string" || mobile.length !== 10) {
      return res.status(422).send({ message: "Invalid Mobile!" });
    }

    if (!name || typeof name !== "string" || !name.length) {
      return res.status(422).send({ message: "Invalid Name!" });
    }

    if (!place || typeof name !== "string" || !place.length) {
      return res.status(422).send({ message: "Invalid Place!" });
    }

    let isMailExist = await userModel.exists({ email });
    if (isMailExist) {
      return res.status(409).send({ message: "User Email Already Exist!!" });
    }

    let isMobileExist = await userModel.exists({ mobile });
    if (isMobileExist) {
      return res.status(409).send({ message: "User Mobile Already Exist!!" });
    }

    let isNameExist = await userModel.exists({ name });
    if (isNameExist) {
      return res.status(409).send({ message: "User Name Already Exist!!" });
    }

    //HASHING PASSWORD
    const hash = await bcrypt.hash(password, 10);

    let User = new userModel({ email, password: hash, mobile, name, place });

    await User.save();

    res.status(200).send({ message: "Registration Success" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Registration Failed", error });
  }
});

app.post("/signin", async function (req, res) {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).send({ message: "Missing Input Paramters" });
    }

    let user = await userModel.findOne({ email });

    if (user) {
      let passwordCheck = bcrypt.compareSync(password, user.password);
      console.log(passwordCheck);
      if (passwordCheck) {
        var token = jwt.sign({ id: user._id, email }, process.env.TOKEN_KEY, {
          expiresIn: "24h",
        });

        res.status(200).send({ message: "Login Success", token });
      } else {
        res.status(401).send({ message: "Unauthorized User!!" });
      }
    } else {
      res.status(404).send({ message: "User Not exist!!" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Login Failed", error });
  }
});

app.post("/getProfile", async function (req, res) {
  try {
    let { email, token } = req.body;

    if (!token) {
      return res.status(404).send({ message: "Unauthorised Page" });
    }

    try {
      const verifiedUser = jwt.verify(token, process.env.TOKEN_KEY);
      console.log(verifiedUser);
    } catch (error) {
      console.log(error);
      return res.status(404).send({ message: "Unauthorised User" });
    }

    let user = await userModel
      .findOne({ email }, { password: 0, _id: 0, __v: 0 })
      .lean();

    if (!user) {
      return res.status(404).send({ message: "User Not Exist" });
    }

    res.status(200).send({ userData: JSON.stringify({ ...user }) });
  } catch (error) {
    console.log(error);
  }
});

app.post("/updateProfile", async function (req, res) {
  try {
    let { email, mobile, name, place, token } = req.body;

    console.log(req.body);
    if (!token) {
      return res.status(404).send({ message: "Unauthorised Page" });
    }

    try {
      const verifiedUser = jwt.verify(token, process.env.TOKEN_KEY);
      console.log(verifiedUser);
    } catch (error) {
      console.log(error);
      return res.status(404).send({ message: "Unauthorised User" });
    }

    // //PASSWORD CHECK

    // let userDetail = await userModel.findOne({email});

    // let passwordCheck =   bcrypt.compareSync(oldPassword, userDetail.password);

    //   if(!passwordCheck){
    //     return res.status(401).send("{message:'Invalid Password'}")
    //   }

    //NEW PASSWORD HASHING

    //   let hash = await bcrypt.hash(newPassword,10);

    let res1 = await userModel
      .findOneAndUpdate({ email }, { mobile, name, place })
      .lean();
    console.log(res1, "S");

    res.status(200).send({ message: "User updated Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Error updating user details" });
  }
});

app.post("/updatePassword", async function (req, res) {
  try {
    let { email, newPassword, oldPassword, token } = req.body;

    if (!token) {
      return res.status(404).send({ message: "Unauthorised Page" });
    }

    try {
      const verifiedUser = jwt.verify(token, process.env.TOKEN_KEY);
      console.log(verifiedUser);
    } catch (error) {
      console.log(error);
      return res.status(404).send({ message: "Unauthorised User" });
    }

    //PASSWORD CHECK

    let userDetail = await userModel.findOne({ email });

    if (!userDetail) {
      res.status(404).send({ message: "User Not Found" });
    }

    let passwordCheck = bcrypt.compareSync(oldPassword, userDetail.password);

    if (!passwordCheck) {
      return res.status(401).send({ message: "Invalid Password" });
    }

    //NEW PASSWORD HASHING

    let hash = await bcrypt.hash(newPassword, 10);

    let res1 = await userModel
      .findOneAndUpdate({ email }, { password: hash })
      .lean();

    if (!res1) {
      res.status(500).send({ message: "Password update Failed" });
    }

    res.status(200).send({ message: "Password updated Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Error updating Password" });
  }
});



// FORGOT PASSWORD

app.post("/forgotpassword",async function(req,res){
 
    try{
        const { email } = req.body;
     
         let saltRounds=10;
        // 
        
            
            userModel.findOne({ email }, async function (err, user) {
                if (err) {
                  console.log(err);
                } else {
                  //Checks user if Existed
                  if (user) {
        
        
                        //Generate New Password
        
                        let password = generator.generate({
                            length: 10,
                            numbers: true
                        });
        
                    async function sendMail() {
                        try {
                          //Mail Config
                          const smtpTransport = nodemailer.createTransport({
                            service: "gmail",
                            auth: {
                              type: "OAuth2",
                              user: "prasannavenkatesh.dev@gmail.com",
                              clientId: process.env.CLIENT_ID,
                              clientSecret: process.env.CLIENT_SECRET,
                              refreshToken: process.env.REFRESH_TOKEN,
                              accessToken: accessToken,
                            },
                            tls: {
                              rejectUnauthorized: false,
                            },
                          });
        
                      
                
                          //Mail Options
                          const mailOptions = {
                            from: "prasannavenkatesh.dev@gmail.com",
                
                            to: email || user.email,
                            subject: "New Password Request",
                            generateTextFromHTML: true,
                            html: `Dear User, <br/>Your New Password for Ecom is <b>${password}</b>. Thank you. Secured by OAuth2.`,
                          };
                
                          //Sending Mail
                           smtpTransport.sendMail(mailOptions, (error, response) => {
                            error ? console.log(error) : console.log(response);
                            smtpTransport.close();
                          });
                        } catch (error) {
                
                          console.log(error);
                        }
                      }
                      sendMail();
        
                      const salt = bcrypt.genSaltSync(saltRounds);
                      const hash = bcrypt.hashSync(password, salt);
                    //   const userData = new User({
                       
                    //     email,
                        
                    //     password: hash,
                    //   });
                
                     userModel.updateOne({email},{
                        $set:{password:hash}
                    },function (err) {
                        if (err) {
                          console.log(err);
                          res.status(500).send({ message: "Password Sent Failed!" });
                        } else {
                          console.log("Password Sent Successfully!!");
                       
                          res.status(200).send({ message: "Password Sent Successfully!" });
                        }
                      });
        
                   
        
                  } else {
                    res.status(404).send({ message: "User Not existed!!" });
                  }
                }
              });
        
    
    
    
    }
    catch (error) {
          console.log(error);
    }
    
    
    
    
    
       
    
    
    
    })

        

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

