const express = require('express');

const path = require('path');
//to parse form data
const bodyParser = require('body-parser');
//importing sessions
const session = require('express-session');
const app = express();

//Interval Scheduler
const cron = require('node-cron');

//Database Connection
const { ObjectId } = require('mongodb');
const { MongoClient } = require("mongodb")
const uri = require('./atlas_uri')
const client = new MongoClient(uri);
const db = client.db('Darwinview');

//Importing Node mailer
const nodemailer = require('nodemailer');

//for python child process
const { exec } = require('child_process');

//to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

//to access static data in public
app.use(express.static(path.join(__dirname, 'public')));

// setting view engine as ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



//creating sessions
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

app.use(bodyParser.json());



app.get('/test', (req, res) => {
    res.render('test');
})




//---------------------- Javascript to python Communicator ------------------------------------- 

app.post('/run-python', async (req, res) => {
    try {
        const pythonScript = req.body.script;
        const serializedData = JSON.stringify(req.body.data); // Assuming data is already in JSON format
        console.log(req.body.data)
        exec(`python3 ${pythonScript} '${serializedData}'`, (error, stdout, stderr) => {
            if (error) {
                res.status(500).json({ error: `Error: ${error.message}` });
                return;
            }
            if (stderr) {
                res.status(500).json({ error: `stderr: ${stderr}` });
                return;
            }
            res.json({ output: stdout });
        });
    } catch (error) {
        res.status(500).json({ error: `Error: ${error.message}` });
    }
});
//-------------------------------------------------------------------------------













var currentDate = new Date();
var currentMonth = currentDate.getMonth();
const currentYear = currentDate.getFullYear();
const currentDayOfMonth = currentDate.getDate();
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const day = String(currentDate.getDate()).padStart(2, '0');
const formattedDate = `${currentYear}-${month}-${day}`;
var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var currentMonthName = monthNames[currentMonth];












//--------------------- Database Connection Verification -------------------------------------

const connectToDatabase = async () => {
    try {

        console.log("Connected to Database")

        //Free API's Everyday     

        await client.connect();
        const collection = db.collection('DailyAPI');

        const result = await collection.updateMany(
            { InterviewDate: { $lt: formattedDate } },
            { $set: { status: "free", RecruiterID: "", CandidateID: "", InterviewDate: "", InterviewID: "" } }
        );

        //Checking Status for every Interview 
        const Log_collection = db.collection('InterviewLog');
        const Log_result = await Log_collection.updateMany(
            { "Details.Interview_Date": { $lt: formattedDate } },
            { $set: { "Details.Interview_Link": "Link Expired" } }
        );
        const Abandoned_result = await Log_collection.updateMany(
            { "Details.Interview_Date": { $lt: formattedDate }, Result: "" },
            { $set: { status: "Abandoned" } }
        );
        const Complete_result = await Log_collection.updateMany(
            { "Details.Interview_Date": { $lt: formattedDate }, Result: { $ne: "" } },
            { $set: { status: "Completed" } }
        );
        const later_completed_result = await Log_collection.updateMany(
            { Result: { $ne: "" } },
            { $set: { status: "Completed" } }
        );

        }
        catch
        {
            console.log("err");
        }

};

const main = async () => {
    try {
        await connectToDatabase();
    }
    catch (err) {
        console.error('error');
    }
    finally {
        await client.close();
    }
};

//running database for every minute
main();
cron.schedule('* * * * *', () => {
    main();
});


//---------------------------------------------------------------------------------------------------



var login_error = "none";

//route for login
app.get('/', (req, res) => {

    res.render('index', { login_error });

});

//logout area 
app.get('/logout', (req, res) => {
    login_error = "none";
    req.session.destroy(err => {
        res.redirect('/');
    });
});
let Candidate_details = {};
let Recruiter_details = {};

//verifying Candidate Credentials
app.post('/Candidate_verify', async (req, res) => {
    const { Candidate_ID, Candidate_Password } = req.body;

    try {
        // Connect to MongoDB
        await client.connect();

        // Access the database and collection
        const collection = db.collection('CandidateProfiles');

        // Query document with Candidate_ID and Candidate_Password
        const result = await collection.findOne({ ID: Candidate_ID });

        // Close the connection
        await client.close();

        if (result) {
            // Credentials matched, set session and redirect
            Candidate_details = result;
            req.session.Candidate_userID = Candidate_ID;
            res.redirect('/Candidate_Home');
        } else {
            // Credentials not matched, redirect to login page with error
            login_error = "error";
            res.redirect('/');
        }
    } catch (error) {
        console.error('Error retrieving data from MongoDB:', error);
        res.redirect('/');
    }
});




app.post('/Recruiter_verify', async (req, res) => {
    const { Recruiter_ID, Recruiter_Password } = req.body;

    try {
        // Connect to MongoDB
        await client.connect();

        // Access the database and collection
        const collection = db.collection('RecruiterProfiles');

        // Query document with Candidate_ID and Candidate_Password
        const result = await collection.findOne({ ID: Recruiter_ID });

        // Close the connection
        await client.close();

        if (result) {
            // Credentials matched, set session and redirect
            Recruiter_details = result;
            req.session.Recruiter_userID = Recruiter_ID;
            res.redirect('/Recruiter_Home');
        } else {
            // Credentials not matched, redirect to login page with error
            login_error = "error";
            res.redirect('/');
        }
    } catch (error) {
        console.error('Error retrieving data from MongoDB:', error);
        res.redirect('/');
    }
});

// route for candidate home
app.get('/Candidate_Home', (req, res) => {

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.session.Candidate_userID) {
        res.render('Candidate_Home', { Candidate_details });
        login_error = "none";

    }
    else {
        res.redirect('/');
    }

});

// route for candidate dashboard
app.get('/Candidate_Dashboard', async (req, res) => {

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.session.Candidate_userID) {

        try {
            // Connect to MongoDB
            await client.connect();


            var collection = db.collection('InterviewLog');

            // Access the database and collection
            var Total_Interviews = await collection.countDocuments({ CandidateID: Candidate_details.ID });
            var Attended_Interviews = await collection.countDocuments({ CandidateID: Candidate_details.ID, Interview_Response: { $ne: "" } });
            var  Resulted = await collection.countDocuments({ CandidateID: Candidate_details.ID, Result: { $ne: "" } });
            var Technical = ""
            var Framework = ""
            var Topic  = ""

            const Cfd_result = await collection.aggregate([
                { $match: { CandidateID: Candidate_details.ID } },
                { $group: { _id: null, totalConfidence: { $sum: "$PreResult.Confidence" } } }
            ]).toArray();
    
            const Com_result = await collection.aggregate([
                { $match: { CandidateID: Candidate_details.ID } },
                { $group: { _id: null, totalCommunication: { $sum: "$PreResult.Communication" } } }
            ]).toArray();
    
            const rele_result = await collection.aggregate([
                { $match: { CandidateID: Candidate_details.ID } },
                { $group: { _id: null, totalRelevance: { $sum: "$PreResult.Relevance" } } }
            ]).toArray();
    
            const Growth = await collection.aggregate([
                { $match: { CandidateID: Candidate_details.ID, Result: { $ne: "" } } },
                { $group: { _id: null, totalGrowth: { $sum: "$PreResult.Growth" } } }
            ]).toArray();

            const growthArray = await collection.aggregate([
                {
                    $match: {
                        CandidateID: Candidate_details.ID,
                        Result: { $ne: "" }
                    }
                },
                {
                    $sort: {
                        "Details.Interview_Date": 1,
                        "Details.Interview_Start": -1
                    }
                },
                {
                    $project: {
                        Growth: "$PreResult.Growth"
                    }
                }
            ]).toArray();
            let Normalized_Growth = []
            
            for(let i of growthArray)
                Normalized_Growth.push(i.Growth)

            const test  = await collection.findOne( {CandidateID: Candidate_details.ID, Result: { $ne: "" } })

            if(test)
            {
            const T_result = await collection.aggregate([
                {
                    $match: {
                        CandidateID: Candidate_details.ID,
                        Result: { $ne: "" }
                    }
                },
                {
                    $group: {
                        _id: null,
                        matchedFieldValues: { $push: "$PreResult.AIRecommendation.Technologies" } 
                    }
                },
                {
                    $project: {
                        _id: 0,
                        matchedString: { $reduce: {
                            input: "$matchedFieldValues",
                            initialValue: "",
                            in: { $concat: ["$$value", "$$this", ", "] }
                        }}
                    }
                }
            ]).toArray();
            Technical = (T_result[0].matchedString);

            const F_result = await collection.aggregate([
                {
                    $match: {
                        CandidateID: Candidate_details.ID,
                        Result: { $ne: "" }
                    }
                },
                {
                    $group: {
                        _id: null,
                        matchedFieldValues: { $push: "$PreResult.AIRecommendation.Framework" } 
                    }
                },
                {
                    $project: {
                        _id: 0,
                        matchedString: { $reduce: {
                            input: "$matchedFieldValues",
                            initialValue: "",
                            in: { $concat: ["$$value", "$$this", ", "] }
                        }}
                    }
                }
            ]).toArray();
            Framework = (F_result[0].matchedString);
            
            const To_result = await collection.aggregate([
                {
                    $match: {
                        CandidateID: Candidate_details.ID,
                        Result: { $ne: "" }
                    }
                },
                {
                    $group: {
                        _id: null,
                        matchedFieldValues: { $push: "$PreResult.AIRecommendation.Framework" } 
                    }
                },
                {
                    $project: {
                        _id: 0,
                        matchedString: { $reduce: {
                            input: "$matchedFieldValues",
                            initialValue: "",
                            in: { $concat: ["$$value", "$$this", ", "] }
                        }}
                    }
                }
            ]).toArray();


            Topic  = (To_result[0].matchedString)
        }


            let Total_Confidence = 0, Total_Communication = 0, Total_Relevance = 0, Total_Growth = 0;
            if (Resulted) {
                Total_Confidence = Cfd_result[0].totalConfidence / Resulted;
                Total_Communication = Com_result[0].totalCommunication / Resulted;
                Total_Relevance = rele_result[0].totalRelevance / Resulted;
                Total_Growth = ((Growth[0].totalGrowth / Resulted)/100)*5;
            }
        

            setTimeout(async () => {
                await client.close();

                    try {
                        // Connect to MongoDB
                        await client.connect();

                        // Access the database and collection
                        const collection = db.collection('CandidateProfiles');

                        const result = await collection.updateMany(
                            { ID: Candidate_details.ID },
                            { $set: 
                                { 
                                    Rating : Total_Growth,
                                    Overall_Statistics: {
                                        Interviews : Total_Interviews,
                                        Attended: Attended_Interviews,
                                        Confidence : Total_Confidence,
                                        Communication : Total_Communication,
                                        Relevance: Total_Relevance,
                                        Recommendations:{ Technical:Technical,Framework:Framework,Topic:Topic,}
                                    }
                                }
                            }
                        );
                        const details  = await collection.findOne({ID:Candidate_details.ID})
                        res.render('Candidate_Dashboard', {details,Normalized_Growth });
                    } catch (error) {
                        console.error('Error retrieving data from MongoDB:', error);
                        res.redirect('/');
                    }
                
            }, 5000); 


        } catch (error) {
            console.error('Error retrieving data from MongoDB:', error);
            res.redirect('/');
        }

    }
    else {
        res.redirect('/');
    }
});


//route for recruiter home

app.get('/Recruiter_Home', (req, res) => {

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.session.Recruiter_userID) {
        var ID = req.session.Recruiter_userID;
        res.render('Recruiter_Home', { Recruiter_details });
    }
    else {
        res.redirect('/');
    }

});


let Interview_API = "";
let New_Interview_ID = "";
app.get('/Interview_Creation', async (req, res) => {

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');



    try {
        // Connect to MongoDB
        await client.connect();

        const API_collection = db.collection("DailyAPI");
        const API_result = await API_collection.findOne({ status: "free" });

        //creating new interview ID
        New_Interview_ID = new ObjectId();
        New_Interview_ID = New_Interview_ID.toString();
        var API_Vacancy = "";
        if (API_result) {
            const result = await API_collection.updateOne(
                { status: "free", API: API_result.API },
                { $set: { status: "taken" } }
            );
            Interview_API = API_result.API;

        }
        if (!API_result) {
            API_Vacancy = "None";
        }

        if (req.session.Recruiter_userID) {
            var ID = req.session.Recruiter_userID;
            res.render('Interview_Creation', { Recruiter_details, New_Interview_ID, API_Vacancy });
        }
        else {
            res.redirect('/');
        }
        // Close the connection
        await client.close();

    } catch (error) {
        console.error('Error retrieving data from MongoDB:', error);
        res.redirect('/Recruiter_Home');
    }

});

app.post('/Creation_Handling', async (req, res) => {
    var Interview_Link = "https://darwinview.daily.co/" + Interview_API;
    const { Interview_ID, Role, Recruiter_Name, Interview_Title, Interview_Date, Interview_Start, Interview_End, Candidate_Email, Candidate_CID, JD } = req.body;
    const responseData = {
        Role,
        Interview_Title,
        Interview_Date,
        Interview_Start,
        Interview_End,
        Candidate_Email,
        Interview_Link
    };

    try {
        // Connect to MongoDB
        await client.connect();

        // Access the database and collection
        const collection = db.collection("InterviewLog");

        const currentTime = new Date();
        const hours = currentTime.getHours().toString().padStart(2, '0');
        const minutes = currentTime.getMinutes().toString().padStart(2, '0');
        const seconds = currentTime.getSeconds().toString().padStart(2, '0');
        const current_time = `${hours}:${minutes}:${seconds}`;

        // Access the database and collection
        const candidate_collection = db.collection('CandidateProfiles');

        // Query document with Candidate_ID and Candidate_Password
        const candidate_result = await candidate_collection.findOne({ ID: Candidate_CID });


        // Insert a single document into the collection
        const document = { InterviewID: `IID${New_Interview_ID}`, CandidateID: Candidate_CID, RecruiterID: Recruiter_details.ID, RecruiterName: Recruiter_Name, Details: responseData, Candidate_Details: candidate_result, Job_Description: JD, Result: "", status: "Upcoming", created_on: formattedDate, created_at: current_time, Interview_Response: "" };
        const result = await collection.insertOne(document);

        const API_collection = db.collection("DailyAPI");
        const API_result = await API_collection.updateOne(
            { API: Interview_API },
            { $set: { RecruiterID: Recruiter_details.ID, CandidateID: Candidate_CID, InterviewDate: Interview_Date, InterviewID: `IID${New_Interview_ID}` } }
        );





        //-------------------------- Sending invitation via mail to the candidate starts -------------------------------------------

        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'darwinview.acquisition@gmail.com',
                pass: 'svyg aetn club yzin'
            }
        });

        const html = `

        <p> Interview ID: ${New_Interview_ID} </p>
        <p>Hi, ${candidate_result.Name} </p> 

        <p>Thank you for applying to the position <b>${Role} </b> . Here are the details attached for more brief about the interview.</p>
        
    
        
        <p> Interview Date: <b>${Interview_Date}</b> </p>
        
        <p> Interview Time: <b>${Interview_Start} - ${Interview_End}</b> </p>
        
        
        <p> Mode of Interview: Darwinview </p>

        <p> Interview Link : ${Interview_Link} </p>
        <p> Hope this finds you well, Please find a time to report few minutes before the interview begins for hassle free experience. </p>
        <br><br><br>
        <p> Best Regards,</p>
        <p> ${Recruiter_Name} </p>
        <p> ${Recruiter_details.Role} </p>
        <p> ${Recruiter_details.Company} </p>
        <P> Contact Recruiter: ${Recruiter_details.Email}</p>
        <small>The information contained in this electronic message and any attachments to this message are intended for the exclusive use of the addressee(s) and may contain proprietary, confidential or privileged information. If you are not the intended recipient, you should not disseminate, distribute, or copy this e-mail. Please notify the sender immediately and destroy all copies of this message and any attachments. WARNING: The recipient of this email should scan this email and all its attachments. Though we are secure, emails can be intercepted, lost, destroyed, corrupted, contain viruses, or arrive late or incomplete. The sender does not accept liability for any errors or omissions in the contents of this message, which arise because of the email transmission. </small>
        `;

        // Email message options
        let mailOptions = {
            from: 'darwinview.acquisition@gmail.com',
            to: Candidate_Email,
            subject: `Interview Scheduled on ${Interview_Title}`,
            html
        };

        // Send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
        });

        //-------------------------- Sending invitation via mail to the candidate Ends -------------------------------------------

        Interview_API = "";
        // Close the connection
        await client.close();

        res.redirect('/Schedule_Log');

    } catch (error) {
        console.error('Error retrieving data from MongoDB:', error);
        res.redirect('/');
    }

});



//route for candidate Log 
var Candidate_currentMonth = currentMonth + 1;
var Candidate_currentYear = currentYear;
var Candidate_currentDayofMonth = currentDayOfMonth;
var Candidate_currentMonthName = currentMonthName;
var Candidate_formattedDate = formattedDate;

app.get('/Candidate_Log', async (req, res) => {

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');


    try {
        // Connect to MongoDB
        await client.connect();

        const collection = db.collection("InterviewLog");
        const cursor = collection.find({ CandidateID: Candidate_details.ID }).sort({ "Details.Interview_Date": -1 });

        if (req.session.Candidate_userID) {
            var ID = req.session.Candidate_userID;
            const result = await cursor.toArray();

            res.render('Candidate_Log', { Candidate_details, Candidate_currentMonth, Candidate_currentYear, result, Candidate_currentDayofMonth, Candidate_currentMonthName, Candidate_formattedDate });
        }
        else {
            res.redirect('/');
        }
        // Close the connection
        await client.close();

    } catch (error) {
        console.error('Error retrieving data from MongoDB:', error);
        res.redirect('/Recruiter_Home');
    }


});

//Updating the dates according to filter in Candidate Log
app.post('/Log_Filter', (req, res) => {

    const { Year, Month } = req.body;
    const idx = monthNames.indexOf(Month);
    Candidate_currentMonth = idx + 1;
    Candidate_currentMonthName = Month;
    Candidate_currentYear = Year;
    res.redirect('/Candidate_Log');

});


//route for schedule log

app.get('/Schedule_Log', async (req, res) => {

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        // Connect to MongoDB
        await client.connect();

        const collection = db.collection("InterviewLog");
        var Upcoming = collection.find({ RecruiterID: Recruiter_details.ID, status: "Upcoming" }).sort({ "Details.Interview_Date": -1 });
        var Completed = collection.find({ RecruiterID: Recruiter_details.ID, status: "Completed" }).sort({ "Details.Interview_Date": -1 });
        var Abandoned = collection.find({ RecruiterID: Recruiter_details.ID, status: "Abandoned" }).sort({ "Details.Interview_Date": -1 });




        if (req.session.Recruiter_userID) {
            Upcoming = await Upcoming.toArray();
            Completed = await Completed.toArray();
            Abandoned = await Abandoned.toArray();
            res.render('Schedule_Log', { Recruiter_details, Upcoming, Completed, Abandoned, formattedDate });
        }
        else {
            res.redirect('/');
        }
        // Close the connection
        await client.close();

    } catch (error) {
        console.error('Error retrieving data from MongoDB:', error);
        res.redirect('/Recruiter_Home');
    }


});

app.post('/delete_invitation', async (req, res) => {

    const { Delete_IID } = req.body;

    console.log(Delete_IID)
    try {
        // Connect to MongoDB
        await client.connect();


        // Access the database and collection
        const Int_collection = db.collection('InterviewLog');

        // Query document with Candidate_ID and Candidate_Password
        const Int_result = await Int_collection.findOne({ InterviewID: Delete_IID });



        //-------------------------- Sending cancellation via mail to the candidate starts -------------------------------------------

        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'darwinview.acquisition@gmail.com',
                pass: 'svyg aetn club yzin'
            }
        });

        const html = `

        <p> Interview ID: ${Delete_IID} </p>
        <p>Hi, ${Int_result.Candidate_Details.Name} </p> 

        <p>Thank you for applying to the position <b>${Int_result.Details.Role} </b> .Unfortunatley the interview has been cancelled. Here are the details attached for more brief about the cancelled interview.</p>
        
    
        
        <p> Interview Date: <b>${Int_result.Details.Interview_Date}</b> </p>
        
        <p> Interview Time: <b>${Int_result.Details.Interview_Start} - ${Int_result.Details.Interview_End}</b> </p>
        
        
        <p> Mode of Interview: Darwinview </p>

        <p> We are regretting for your inconvenience, feel free to contact the recruiter for more details. </p>
        <br><br><br>
        <p> Best Regards,</p>
        <p> ${Recruiter_details.Name} </p>
        <p> ${Recruiter_details.Role} </p>
        <p> ${Recruiter_details.Company} </p>
        <P> Contact Recruiter: ${Recruiter_details.Email}</p>
        <small>The information contained in this electronic message and any attachments to this message are intended for the exclusive use of the addressee(s) and may contain proprietary, confidential or privileged information. If you are not the intended recipient, you should not disseminate, distribute, or copy this e-mail. Please notify the sender immediately and destroy all copies of this message and any attachments. WARNING: The recipient of this email should scan this email and all its attachments. Though we are secure, emails can be intercepted, lost, destroyed, corrupted, contain viruses, or arrive late or incomplete. The sender does not accept liability for any errors or omissions in the contents of this message, which arise because of the email transmission. </small>
        `;

        // Email message options
        let mailOptions = {
            from: 'darwinview.acquisition@gmail.com',
            to: Int_result.Details.Candidate_Email,
            subject: `Interview Cancelled on ${Int_result.Details.Interview_Title}`,
            html
        };

        // Send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
        });

        //-------------------------- Sending invitation via mail to the candidate Ends -------------------------------------------

        const collection = db.collection('DailyAPI');

        const result = await collection.updateOne(
            { InterviewID: Delete_IID },
            { $set: { status: "free", RecruiterID: "", CandidateID: "", InterviewDate: "", InterviewID: "" } }
        );

        const Log_collection = db.collection('InterviewLog');
        const Log_result = await Log_collection.deleteOne(
            { InterviewID: Delete_IID },
        );


        // Close the connection
        await client.close();

        res.redirect('/Schedule_Log');

    } catch (error) {
        console.error('Error retrieving data from MongoDB:', error);
        res.redirect('/Recruiter_Home');
    }

});

//route for interviewsession
var Entering_ILink = "";
var Entering_IID = "";
app.post('/Handle_Entrance', (req, res) => {

    var { IID, ILink } = req.body;
    Entering_IID = IID;
    Entering_ILink = ILink;
    res.redirect('/InterviewSession');

});



app.get('/InterviewSession', async (req, res) => {

    if (req.session.Recruiter_userID) {
        try {
            // Connect to MongoDB
            await client.connect();

            const collection = db.collection("InterviewLog");
            const cursor = await collection.findOne({ InterviewID: Entering_IID });

            if (!Entering_IID || !Entering_ILink) // Checking if Entering_IID or Entering_ILink is empty or undefined
                res.redirect('/Schedule_Log');
            else
                res.render('InterviewSession', { Entering_IID, Entering_ILink, cursor });

            // Close the connection (moved outside the try block to ensure it's always executed)
            await client.close();
        } catch (error) {
            console.error('Error retrieving data from MongoDB:', error);
            res.redirect('/Schedule_log');
        }
    } else {
        res.redirect('/');
    }
    const { response } = req.body;
    console.log(response);
});


//--------------- Continuosly storing Interview Response to database - to prevent data lose ------------------



// Route to handle the AJAX request
app.post('/save-data', async (req, res) => {
    try {
        // Access the data sent from the client
        const data = req.body.data;


        // Connect to MongoDB
        await client.connect();

        const collection = db.collection("InterviewLog");
        // console.log(data);

        // Insert the data into the collection
        const prev_result = await collection.findOne({ InterviewID: Entering_IID},{Interview_Response:1})
        if(data)
        {
        if ( prev_result.Interview_Response.length <= data.length) {
            const result = await collection.updateOne({ InterviewID: Entering_IID }, { $set: { Interview_Response: data } });
        }
        }

        // Close the connection
        await client.close();

        // Send a success response to the client
        res.sendStatus(200);
    } catch (error) {
        console.error('Error saving data to MongoDB:', error);
        // Send an error response to the client
        res.status(500).send('Internal Server Error');
    }
});

//------------------------------------------------------------------------------------------------------

app.post('/Evaluate_Result', async (req, res) => {

    var confidence_rate = 0;
    var fitness_rate = 0;
    var communication_rate = 0;
    var AI_feedback = "";
    var recommended_technologies = "";
    var recommended_frameworks = "";
    var recommended_topics = "";
    var relevance_rate = 0;
    var growth_rate = 0;

    var candidate_response = "";
    var JD = "";
    const { response_IID } = req.body;

    try {

        // Connect to MongoDB
        await client.connect();

        const collection = db.collection("InterviewLog");

        // Insert the data into the collection
        const result = await collection.findOne({ InterviewID: response_IID })
        candidate_response = result.Interview_Response;
        JD = result.Job_Description

        // Close the connection
        await client.close();

    } catch (error) {

        console.error('Error saving data to MongoDB:', error);
        // Send an error response to the client
        res.status(500).send('Internal Server Error');

    }




    candidate_response = candidate_response.replace(/'/g, "");
    JD = JD.replace(/'/g, "");

    const pythonScriptPath = '/home/akhil/Desktop/Darwinview_Nodejs/public/AzureChat.py';


    //-------------------------------- Confidence Rate Calculation -----------------------------------------------

    // Serialize the data to JSON
    serializedData = JSON.stringify(`${candidate_response} \n \n Confidence Percentage is measured in terms of how confident  the candidate communicating  to recruiter question considering candidate fear/nervousness/panic . As a recruiter I wanted to know the Confidence percentage out ot 100 estimated from given conversation. I just need the number no description/clarification needed only the number out of 100 no characters in the output`);

    // Execute the Python script

    const Confidence_pythonProcess = exec(`python3 ${pythonScriptPath} '${serializedData}'`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${error}`);
            return;
        }
        confidence_rate = parseInt(stdout,10)
        console.log(`Confidence Rate: ${stdout}`);
    });


    //--------------------------------------------------------------------------------------------------------------------------



    //-------------------------------- Relevance Percentage Calculation -----------------------------------------------

    // Serialize the data to JSON
    var serializedData = JSON.stringify(`${candidate_response} \n \n Relevance Percentage is measured in terms of how much relevant the candidate responding to recruiter question considering candidate technical knowledge,Correctness. As a recruiter I wanted to know the Relevance percentage out ot 100 estimated from given conversation. I just need the number no description/clarification needed only the number out of 100 no characters in the output`);

   

    // Execute the Python script

    const Relevance_pythonProcess = exec(`python3 ${pythonScriptPath} '${serializedData}'`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${error}`);
            return;
        }
        relevance_rate = parseInt(stdout,10)
        console.log(`Relavance Rate: ${stdout}`);
    });



    //--------------------------------------------------------------------------------------------------------------------------


    //-------------------------------- Communicational Rate Calculation -----------------------------------------------

    // Serialize the data to JSON
    serializedData = JSON.stringify(`${candidate_response} \n \n Communicational Percentage is measured in terms of how well the candidate communicating  to recruiter question considering candidate grammar,sentence formation,vocabulary. As a recruiter I wanted to know the Relevance percentage out ot 100 estimated from given conversation. I just need the number no description/clarification needed only the number out of 100 no characters in the output`);


    // Execute the Python script

    const Communicational_pythonProcess = exec(`python3 ${pythonScriptPath} '${serializedData}'`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${error}`);
            return;
        }
        communication_rate = parseInt(stdout,10)
        console.log(`Communicatioanl Rate: ${stdout}`);
    });


    //--------------------------------------------------------------------------------------------------------------------------    

        
    function FitnessScore() {
            //-------------------------------- Fitness Rate Calculation -----------------------------------------------

            // Serialize the data to JSON
            serializedData = JSON.stringify(` this is totally a new conversation forget about previous conversations . ${candidate_response} \n \n this is coversation between interviewer & candidate. ${JD} \n \n This is Job Description. \n ${confidence_rate} this is candidate confidence rate out of 100 i.e how much confident the candidate is,during the interview. ${communication_rate} this is communicational rate out of 100for candidate i.e how well she is communicating. ${relevance_rate} this is relevance rate out of 100 i.e how relevant the candidate is responding to interviewer. Based on this parameters, & JD & conversation As a recruiter i wanted how fit the candidate is, by considering the JD. Just give me value out of 100.should not contain characters in response only the number.  `);




            // Execute the Python script

            const fitness_pythonProcess = exec(`python3 ${pythonScriptPath} '${serializedData}'`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing Python script: ${error}`);
                    return;
                }
                fitness_rate  = parseInt(stdout,10)
                console.log(`Fitness Rate: ${stdout}`);
            });


            //--------------------------------------------------------------------------------------------------------------------------



                //-------------------------------- AI Feedback -----------------------------------------------

                // Serialize the data to JSON
                serializedData = JSON.stringify(` this is totally a new conversation forget about previous conversations .\n\n ${candidate_response} \n \n this is coversation between interviewer & candidate. ${JD} \n \n This is Job Description. \n ${confidence_rate} this is candidate confidence rate out of 100 i.e how much confident the candidate is,during the interview. ${communication_rate} this is communicational rate out of 100 for candidate i.e how well candidate communicating. ${relevance_rate} this is relevance rate out of 100 i.e how relevant the candidate is responding to interviewer. Based on this parameters, & JD & conversation. Give your feedback regarding candidate performance both technically & non technically for candidate.give me response completely. `);




                // Execute the Python script

                const feedback_pythonProcess = exec(`python3 ${pythonScriptPath} '${serializedData}'`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error executing Python script: ${error}`);
                        return;
                    }
                    AI_feedback = stdout
                    console.log(`Feedback: ${stdout}`);
                });


               //--------------------------------------------------------------------------------------------------------------------------


                //-------------------------------- Technologies Recommendation -----------------------------------------------

                // Serialize the data to JSON
                serializedData = JSON.stringify(` this is totally a new conversation forget about previous conversations . ${JD} \n \n This is Job Description. \n suggest me the required technologies for given JD, tell me only the most important top 5 technologies related to given JD.I need only the names of them no description/clarification NEEDED , the output should be in a list with comma separated without any serial numbers only the comma seprated output`)




                // Execute the Python script

                const Technologies_pythonProcess = exec(`python3 ${pythonScriptPath} '${serializedData}'`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error executing Python script: ${error}`);
                        return;
                    }
                    recommended_technologies = stdout
                    console.log(`T: ${stdout}`);
                });


               //-------------------------------------------------------------------------------------------------------------------------

                //-------------------------------- Framework Recommendation -----------------------------------------------

                // Serialize the data to JSON
                serializedData = JSON.stringify(`  this is totally a new conversation forget about previous conversations .${JD} \n \n This is Job Description. \n suggest me the required Frameworks to learn for given JD.  needed,tell me only the most important top 5 frameworks related to given JD. I need only the names of them no description/clarification NEEDED, the output should be in comma seperated list without any serial numbers only the comma seprated output`)




                // Execute the Python script

                const Framework_pythonProcess = exec(`python3 ${pythonScriptPath} '${serializedData}'`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error executing Python script: ${error}`);
                        return;
                    }
                    recommended_frameworks = stdout
                    console.log(`FW ${stdout}`);
                });


               //-------------------------------------------------------------------------------------------------------------------------

                //-------------------------------- Topic Recommendation -----------------------------------------------

                // Serialize the data to JSON
                serializedData = JSON.stringify(`  this is totally a new conversation forget about previous conversations . ${JD} \n \n This is Job Description.  suggest me the required topics to learn for given JD. tell me only the most important top 5 topics  related to given JD.I need only the names of them no description/ clarification NEEDED, the output should be in a list with comma separated without any serial numbers only the comma seprated output `)




                // Execute the Python script

                const Topic_pythonProcess = exec(`python3 ${pythonScriptPath} '${serializedData}'`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error executing Python script: ${error}`);
                        return;
                    }
                    recommended_topics = stdout
                    console.log(`Topics: ${stdout}`);
                });


               //-------------------------------------------------------------------------------------------------------------------------
            
    }
        
        setTimeout(FitnessScore, 5000);


        function GrowthScore() {

            growth_rate = Math.floor((confidence_rate + relevance_rate + communication_rate)/3)
            console.log(confidence_rate,communication_rate,relevance_rate,growth_rate)
                
        }
        setTimeout(GrowthScore, 9000);

        async function InsertData(){

            try {

                // Connect to MongoDB
                await client.connect();
        
                const collection = db.collection("InterviewLog");
        
                // Insert the data into the collection
                const result = await collection.updateOne({ InterviewID: response_IID },{$set:{PreResult:{Confidence:confidence_rate,Relevance:relevance_rate,Communication:communication_rate,Growth:growth_rate,Fitness:fitness_rate,AIFeedback:AI_feedback,AIRecommendation:{Technologies:recommended_technologies,Framework:recommended_frameworks,Topics:recommended_topics}}}})
        
                // Close the connection
                await client.close();
                res.redirect('/Schedule_log')
        
        
            } catch (error) {
        
                console.error('Error saving data to MongoDB:', error);
                // Send an error response to the client
                res.status(500).send('Internal Server Error');
        
            }
        }
        setTimeout(InsertData, 15000)


});


app.post('/Final_Result', async (req,res)=>{

    const {Result_IID,RecruiterFeedback,Selection} = req.body;
    
    try {

        // Connect to MongoDB
        await client.connect();

        const collection = db.collection("InterviewLog");

        // Insert the data into the collection
        const result = await collection.updateOne({ InterviewID: Result_IID },{$set:{Result:{RecruiterFeedback:RecruiterFeedback,Selection:Selection}}})

        // Close the connection
        await client.close();
        res.redirect('/Schedule_log')


    } catch (error) {

        console.error('Error saving data to MongoDB:', error);
        // Send an error response to the client
        res.status(500).send('Internal Server Error');

    }
    



})



//server port

var port = 5454;
app.listen(port, () => {
    console.log('server running at https://localhost:' + port);
});
