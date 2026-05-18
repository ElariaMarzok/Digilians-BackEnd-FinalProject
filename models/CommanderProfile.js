import mongoose from "mongoose";

const commanderProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        rank: {
            type: String,
            trim: true,
            default: "",
        },

        department: {
            type: String,
            trim: true,
            default: "",
        },

        responsibility: {
            type: String,
            trim: true,
            default: "مسؤول شؤون الطلاب",
        },

        permissionsScope: {
            type: String,
            enum: ["department", "course", "academy"],
            default: "department",
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

const CommanderProfile = mongoose.model(
    "CommanderProfile",
    commanderProfileSchema
);

export default CommanderProfile;