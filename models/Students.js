const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    institutionCode: {
        type: String,
        required: true,
    }, 
    email: {
        type: String,
        required: true,
        unique: true
    }, 
    sentOn: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['Pending', 'Accepted'], 
        default: 'Pending'
    },
    
}, {
    timestamps: true
});

const Students = mongoose.model('Students', studentSchema);
module.exports = Students;
