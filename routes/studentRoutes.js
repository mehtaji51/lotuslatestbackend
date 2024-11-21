const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const Student = require('../models/Students.js');
const router = express.Router();
const User = require("../models/User.js");
const Students = require('../models/Students.js');



const storage = multer.memoryStorage();
const upload = multer({ storage });


// POST route for file upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { institutionCode } = req.query;
    console.log(institutionCode);
    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }


    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);


    const emails = data.map(row => row.Email);


    console.log(emails);


    const studentPromises = emails.map(async (email) => {
      return await Student.updateOne(
        { email },
        {
          $set: { institutionCode, sentOn: new Date(), status: "Pending" }, 
          $setOnInsert: { email } 
        },
        { upsert: true }
      );
    });

    await Promise.all(studentPromises);


    const updatedStudents = await Student.find({ email: { $in: emails } }); // Fetch updated students
    res.status(200).json({ message: "File uploaded and processed successfully!", students: updatedStudents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to process the file." });
  }
});

//fetch all students
router.get('/:institutionCode', async (req, res) => {
  try {
    const institutionCode = req.params.institutionCode;
    console.debug(institutionCode);
    const students = await Students.find({institutionCode:institutionCode});
    return res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ message: "Error fetching students" });
  }
});

// UPDATE student status
router.post('/update-status', async (req, res) => {
  console.log("route accessed");
  try {

    const { email } = req.body;
    console.log("Received email for update:", email); // Confirm email is received

    const updatedStudent = await Students.findOneAndUpdate(
      { email: email },  // find by email
      {
        $set: {
          status: "accepted"
        }
      },
      {
        new: true
      }
    );

    if (!updatedStudent) {
      console.log("No student found with email:", email);
      return res.status(404).json({
        success: false,
        error: `No student found with email: ${email}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Status updated to 'accepted' for ${email}`,
      data: {
        student: updatedStudent
      }
    });

  } catch (error) {
    console.log("Error in update-status route:", error); // Log error details
    return res.status(400).json({
      success: false,
      error: error.message,
      details: 'Error updating student status'
    });
  }
});


router.get('/test', (req, res) => {
  res.json({ message: 'Students route working' });
});


module.exports = router;
