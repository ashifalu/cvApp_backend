const mongoose = require('mongoose');

const resumeSchema = mongoose.Schema({

      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },

    previewData: {
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
                startDate: String,
                endDate: String,
                grade: String
            }
        ],

        experience: [
            {
                jobTitle: String,
                employer: String,
                startDate: String,
                endDate: String,
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
                issuingOrg: String,   // fixed: was Date, should be org name
                description: String,
                issuingDate: String,    // fixed typo
                expirationDate: String,
            }
        ],
    },

    theme: {
        type: Object,
    },
    template:{
        type:String,
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