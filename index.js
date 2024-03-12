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


var currentDate = new Date();
var currentMonth = currentDate.getMonth();
const currentYear = currentDate.getFullYear();
const currentDayOfMonth = currentDate.getDate();
const month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
const day = String(currentDate.getDate()).padStart(2, '0');
const formattedDate = `${currentYear}-${month}-${day}`;
var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var currentMonthName = monthNames[currentMonth];

//--- Database Connection Verification -------

const connectToDatabase = async()=>{
    try{

    console.log("Connected to Database")
    //Free API's Everyday     

    await client.connect();
    const collection = db.collection('DailyAPI');
    
    const result = await collection.updateMany(
        { InterviewDate:{$lt:formattedDate}  },
        { $set: { status: "free" , RecruiterID:"", CandidateID:"",InterviewDate:"",InterviewID:""} }
    );

    //Checking Status for every Interview 
    const Log_collection = db.collection('InterviewLog');
    const Log_result = await Log_collection.updateMany(
        { "Details.Interview_Date":{$lt:formattedDate}  },
        { $set: { "Details.Interview_Link": "Link Expired"} }
    );
    const Abandoned_result = await Log_collection.updateMany(
        { "Details.Interview_Date":{$lt:formattedDate}, Result:""  },
        { $set: { status: "Abandoned"} }
    );
    const Complete_result = await Log_collection.updateMany(
        { "Details.Interview_Date":{$lt:formattedDate}, Result:{$ne:""}  },
        { $set: { status: "Completed"} }
    );
    const later_completed_result = await Log_collection.updateMany(
        {  Result:{$ne:""}  },
        { $set: { status: "Completed"} }
    );
    }
    catch 
    {
        console.log("err");
    }
};

const main = async ()=>{
    try{
        await connectToDatabase();
    }
    catch(err){
        console.error('error');
    }
    finally{
        await client.close();
    }
};

//running database for every minute
main();
cron.schedule('* * * * *', () => {
    main();
  });


//-----------------------------------------

//to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

//to access static data in public
app.use(express.static(path.join(__dirname,'public')));

// setting view engine as ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



//creating sessions
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));
var login_error = "none";


//route for login
app.get('/',(req,res)=>{

    res.render('index',{login_error});    
    
});

//logout area 
app.get('/logout',(req,res)=>{
    login_error = "none";
    req.session.destroy(err => {
        res.redirect('/');
    });
});
let Candidate_details={};
let Recruiter_details={};

//verifying Candidate Credentials
app.post('/Candidate_verify', async (req, res) => {
    const { Candidate_ID, Candidate_Password } = req.body;
    
    try {
        // Connect to MongoDB
        await client.connect();
        
        // Access the database and collection
        const collection = db.collection('CandidateProfiles');

        // Query document with Candidate_ID and Candidate_Password
        const result = await collection.findOne({ ID: Candidate_ID});

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
        const result = await collection.findOne({ ID: Recruiter_ID});

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
    
    if(req.session.Candidate_userID)
    {
        res.render('Candidate_Home', { Candidate_details });
        login_error = "none";

    }
    else
    {
        res.redirect('/');
    }

});

// route for candidate dashboard
app.get('/Candidate_Dashboard',(req,res)=>{

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if(req.session.Candidate_userID)
    {
        var ID = req.session.Candidate_userID; 
        res.render('Candidate_Dashboard', { Candidate_details });
    }
    else
    {
        res.redirect('/');
    }
});


//route for recruiter home

app.get('/Recruiter_Home', (req,res)=>{

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if(req.session.Recruiter_userID)
    {
        var ID = req.session.Recruiter_userID; 
        res.render('Recruiter_Home', { Recruiter_details });
    }
    else
    {
        res.redirect('/');
    }
    
});


let Interview_API = "";
let New_Interview_ID = "";
app.get('/Interview_Creation',async (req,res)=>{

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');



    try {
        // Connect to MongoDB
        await client.connect();
        
        const API_collection = db.collection("DailyAPI");
        const API_result = await API_collection.findOne({ status: "free"});

        //creating new interview ID
        New_Interview_ID = new ObjectId();
        New_Interview_ID = New_Interview_ID.toString();
        var API_Vacancy = "";
        if(API_result && Interview_API==="")
        {
            const result = await API_collection.updateOne(
                { status: "free" },
                { $set: { status: "taken" } }
            );
            Interview_API = API_result.API;
    
        }
        if(!API_result && Interview_API=="")
        {
            API_Vacancy = "None";
        }

        if(req.session.Recruiter_userID)
        {
            var ID = req.session.Recruiter_userID; 
            res.render('Interview_Creation', { Recruiter_details,New_Interview_ID,API_Vacancy });
        }
        else
        {
            res.redirect('/');
        }
        // Close the connection
        await client.close();

    } catch (error) {
        console.error('Error retrieving data from MongoDB:', error);
        res.redirect('/Recruiter_Home');
    }

});

app.post('/Creation_Handling',async (req,res)=>{
    var Interview_Link = "https://darwinview.daily.co/"+Interview_API;
    const{Interview_ID,Role,Recruiter_Name,Interview_Title,Interview_Date,Interview_Start,Interview_End,Candidate_Email,Candidate_CID}=req.body;
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
        const candidate_result = await candidate_collection.findOne({ ID: Candidate_CID});


        // Insert a single document into the collection
        const document = {InterviewID:`IID${New_Interview_ID}`,CandidateID:Candidate_CID,RecruiterID:Recruiter_details.ID,RecruiterName:Recruiter_Name, Details: responseData,Candidate_Details:candidate_result,Result:"",status:"Upcoming",created_on:formattedDate,created_at:current_time}; 
        const result = await collection.insertOne(document);
        
        const API_collection = db.collection("DailyAPI");
        const API_result = await API_collection.updateOne(
            { API: Interview_API },
            { $set: { RecruiterID: Recruiter_details.ID, CandidateID: Candidate_CID, InterviewDate:Interview_Date,InterviewID:`IID${New_Interview_ID}`} }
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
var Candidate_currentMonth = currentMonth+1;
var Candidate_currentYear = currentYear;
var Candidate_currentDayofMonth = currentDayOfMonth;
var Candidate_currentMonthName = currentMonthName;
var Candidate_formattedDate = formattedDate;

app.get('/Candidate_Log',async (req,res)=>{

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    

    try {
        // Connect to MongoDB
        await client.connect();
        
        const collection = db.collection("InterviewLog");
        const cursor = collection.find({ CandidateID: Candidate_details.ID });

        if(req.session.Candidate_userID)
        {
            var ID = req.session.Candidate_userID; 
            const result = await cursor.toArray();

            res.render('Candidate_Log', { Candidate_details,Candidate_currentMonth,Candidate_currentYear,result,Candidate_currentDayofMonth,Candidate_currentMonthName,Candidate_formattedDate });
        }
        else
        {
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
app.post('/Log_Filter',(req,res)=>{

    const{Year,Month} = req.body;
    const idx = monthNames.indexOf(Month);
    Candidate_currentMonth = idx+1;
    Candidate_currentMonthName = Month;
    Candidate_currentYear = Year;
    res.redirect('/Candidate_Log');    

});


//route for schedule log

app.get('/Schedule_Log',async (req,res)=>{
    
    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        // Connect to MongoDB
        await client.connect();
        
        const collection = db.collection("InterviewLog");
        var Upcoming = collection.find({ RecruiterID: Recruiter_details.ID, status: "Upcoming"});
        var Completed = collection.find({ RecruiterID: Recruiter_details.ID,status:"Completed" });
        var Abandoned = collection.find({ RecruiterID: Recruiter_details.ID,status:"Abandoned" });

    


        if(req.session.Recruiter_userID)
        {
            Upcoming = await Upcoming.toArray();
            Completed = await Completed.toArray();
            Abandoned = await Abandoned.toArray();
            res.render('Schedule_Log',{Recruiter_details,Upcoming,Completed,Abandoned,formattedDate} );
        }
        else
        {
            res.redirect('/');
        }
        // Close the connection
        await client.close();

    } catch (error) {
        console.error('Error retrieving data from MongoDB:', error);
        res.redirect('/Recruiter_Home');
    }

    
});

app.post('/delete_invitation', async(req,res)=>{

    const{Delete_IID} = req.body;

    console.log(Delete_IID)
    try {
        // Connect to MongoDB
        await client.connect();
        

        // Access the database and collection
        const Int_collection = db.collection('InterviewLog');

        // Query document with Candidate_ID and Candidate_Password
        const Int_result = await Int_collection.findOne({ InterviewID: Delete_IID});
        


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
            { InterviewID:Delete_IID  },
            { $set: { status: "free" , RecruiterID:"", CandidateID:"",InterviewDate:"",InterviewID:""} }
        );
    
        const Log_collection = db.collection('InterviewLog');
        const Log_result = await Log_collection.deleteOne(
            { InterviewID:Delete_IID },
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
var Entering_ILink= "";
var Entering_IID = "";
app.post('/Handle_Entrance', (req,res)=>{

    var {IID,ILink} = req.body;
    Entering_IID = IID;
    Entering_ILink = ILink;
    console.log(IID);
    console.log(ILink)
    res.redirect('/InterviewSession');
    
});
app.get('/InterviewSession', (req,res)=>{

    if(Entering_IID==""||Entering_ILink=="")
    res.redirect('/Schedule_Log')
    else
    res.render('InterviewSession',{Entering_IID,Entering_ILink});
});

//server port
var port = 5454;
app.listen(port,()=>{
    console.log('server running at https://localhost:'+port);
});
