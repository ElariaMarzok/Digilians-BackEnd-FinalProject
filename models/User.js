import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },

        militaryId: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
        },

        role: {
            type: String,
            enum: ["student", "mentor", "admin", "commander", "super_admin"],
            default: "student",
        },

        phoneNumber: {
            type: String,
            trim: true,
        },

        image: {
            type: String,
            default:
                "https://ui-avatars.com/api/?name=User&background=eee&color=888&size=160",
        },

        title: String,

        bio: String,

        preferredLanguage: {
            type: [String],
            enum: ["arabic", "english"],
            default: ["english"],
        },

        isRegistered: {
            type: Boolean,
            default: false,
        },

        // Old student fields from the existing project
        // We are keeping them to avoid breaking any other teammate's work
        education: String,
        skills: [String],
        careerGoals: String,

        cvs: [
            {
                url: {
                    type: String,
                    required: true,
                },
                public_id: {
                    type: String,
                    required: true,
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate password reset token
userSchema.methods.generatePasswordReset = function () {
    const token = crypto.randomBytes(20).toString("hex");

    this.resetPasswordToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex"); 

    this.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    return token;
};

const User = mongoose.model("User", userSchema);

export default User;