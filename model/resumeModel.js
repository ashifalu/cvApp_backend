const mongoose = require('mongoose');

const resumeSchema = mongoose.Schema({

      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
    
      title: {
        type: String,
        default: ""
      },
      pdfUrl: {
        type: String,
        default: ""
      }
    
    }, { timestamps: true });
    

const resumes = mongoose.model('resumes',resumeSchema);

module.exports = resumes