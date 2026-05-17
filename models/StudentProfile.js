import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        department: {
            type: String,
            trim: true,
            default: "",
        },

        specialization: {
            type: String,
            trim: true,
            default: "",
        },

        course: {
            type: String,
            trim: true,
            default: "",
        },

        specializationDuration: {
            type: String,
            trim: true,
            default: "غير محدد",
        },

        status: {
            type: String,
            enum: ["active", "warning_one", "warning_two", "dismissed"],
            default: "active",
        },

        attendance: {
            absenceDays: {
                type: Number,
                default: 0,
                min: 0,
            },
        },

        grades: {
            behavior: {
                type: Number,
                default: 100,
                min: 0,
                max: 100,
            },

            history: [
                {
                    label: {
                        type: String,
                        required: true,
                        trim: true,
                    },
                    value: {
                        type: Number,
                        required: true,
                        min: 0,
                        max: 100,
                    },
                },
            ],
        },

        notes: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

const StudentProfile = mongoose.model("StudentProfile", studentProfileSchema);

export default StudentProfile;