const mongoose = require('mongoose');

const infoSchema = mongoose.Schema({

      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
    
    
      personalInfo: {
        firstName: String,
        lastName: String,
        role: String,
        photo: String,
        linkedInUrl: String,
        email: String,
        phone: String,
        country: String,
        city: String,
        nationality: String,
      },
      professionalSummary: {
        type: String
      },
    
      education: [
        {
          school: String,
          degree: String,
          fieldOfStudy: String,
          startDate: Date,
          endDate: Date,
          grade: String
        }
      ],
    
      experience: [
        {
            jobTitle: String,
            employer: String,
            startDate: Date,
            endDate: Date,
            country: String,
            city: String,
            responsibilities: [String]
        }
      ],
    
      skills: [
        {
            skill: String,
            level: Number,
        }
      ],
      languages: [
        {
            language: String,
            level: Number,
        }
      ],
    
      projects: [
        {
            projectTitle: String,
            keyFeatures: [String],
            projectUrl: String
        }
      ],
    
      awards: [
        {
            awardName: String,
            issueingOrg: Date,
            description: String,
            issueingDate: Date,
            expirationDate: Date,
        }
      ],
    
    
    }, { timestamps: true });
    

const info = mongoose.model('info',infoSchema);

module.exports = info