const express = require("express");
const router = express.Router();
const User = require("../../models/User.js");
const Enrollment = require('../../models/Enrollment.js');
const Course =  require('../../models/CourseModel.js');
const logger = require('../../logger.js')

router.post("/get-students", async (req, res, next) => {
  try {
    const code = req.body.code;

    // Find all students based on institution code
    const students = await User.find({
      "institution.code": code,
      accountType: "student",
    });

    // Fetch all enrollments for each student and populate the course field
    const studentWithEnrollments = await Promise.all(
      students.map(async (student) => {
        const enrollments = await Enrollment.find({ learner: student._id })
          .populate("course")  // Populate the course associated with each enrollment
          .lean();

        // Ensure all enrollments have a visible field (default to true)
        const updatedEnrollments = enrollments.map((enrollment) => ({
          ...enrollment,
          visible: enrollment.visible !== undefined ? enrollment.visible : true,
        }));

        return {
          ...student.toObject(),
          enrollments: updatedEnrollments, // Attach all enrollments for the student
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: studentWithEnrollments,
    });
  } catch (error) {
    console.error("Error fetching students with enrollments:", error);
    return next(error);
  }
});

router.post("/get-students-by-ids", async (req, res, next) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "No student IDs provided." });
    }

    // Find all students with the given IDs
    const students = await User.find({
      _id: { $in: studentIds },
      accountType: "student",
    })
      .select("firstName lastName email username institution") // Select only necessary fields
      .lean(); // Convert Mongoose documents to plain JavaScript objects

    // Fetch enrollments for each student and populate the course field
    const studentsWithEnrollments = await Promise.all(
      students.map(async (student) => {
        const enrollments = await Enrollment.find({ learner: student._id })
          .populate("course", "title description") // Populate necessary fields from the course model
          .lean();

        // Ensure all enrollments have a visible field (default to true)
        const updatedEnrollments = enrollments.map((enrollment) => ({
          ...enrollment,
          visible: enrollment.visible !== undefined ? enrollment.visible : true,
        }));

        return {
          ...student,
          enrollments: updatedEnrollments, // Attach enrollments to each student
        };
      })
    );

    return res.status(200).json({
      success: true,
      students: studentsWithEnrollments,
    });
  } catch (error) {
    console.error("Error fetching students by IDs:", error);
    return next(error);
  }
});

router.post("/get-teachers", async (req, res, next) => {
    try {
      const code = req.body.code;
      const users = await User.find({
        $and: [{ "institution.code": code }, { accountType: "instructor" }],
      });
      if (users) {
        return res.status(200).json({
          success: true,
          data: users,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: "Error at /admin/get-teachers",
        });
      }
    } catch (error) {
      return next(error);
    }
  });


  router.post('/enroll-all-students', async (req, res) => {
    const { institutionCode, courseId } = req.body;
  
    try {
    
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
  
      // Find all users (students) with the same institution code
      
      const students = await User.find({
        'institution.code': institutionCode,
        accountType: { $in: ['student', 'instructor'] }
      });
      

      /*
      const students = await User.find({
        'institution.code': institutionCode,
        accountType: 'student'  
      });
      */
  
      if (!students.length) {
        return res.status(200).json({
          success: true,
          message: 'No students found in this institution',
        });
      }
  
      
      const enrollments = students.map(async (student) => {
        
        const enrollment = new Enrollment({
          course: course._id, 
          learner: student._id, 
          currentLesson: null, 
          completedLessons: [], 
        });
  
        await enrollment.save();
  
        // Update the student's enrolledCourses array
        student.enrolledCourses.push(enrollment._id); 
        await student.save();
      });
  
      await Promise.all(enrollments); 
  
      return res.status(200).json({ success: true, message: 'All students enrolled successfully' });
  
    } catch (error) {
      console.error('Error enrolling students:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  
module.exports = router;
