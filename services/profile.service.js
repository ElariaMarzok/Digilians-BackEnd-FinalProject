import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import CommanderProfile from "../models/CommanderProfile.js";

const formatUserBasicData = (user) => {
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        militaryId: user.militaryId,
        role: user.role,
        image: user.image,
        phoneNumber: user.phoneNumber,
    };
};

export const getOrCreateStudentProfile = async (user) => {
    let profile = await StudentProfile.findOne({ user: user._id });

    if (!profile) {
        profile = await StudentProfile.create({
            user: user._id,
            specializationDuration: "غير محدد",
            attendance: {
                absenceDays: 0,
            },
            grades: {
                behavior: 100,
                history: [
                    {
                        label: "البداية",
                        value: 100,
                    },
                ],
            },
        });
    }

    return {
        student: formatUserBasicData(user),
        department: profile.department,
        specialization: profile.specialization,
        course: profile.course,
        specializationDuration: profile.specializationDuration,
        status: profile.status,
        attendance: profile.attendance,
        grades: profile.grades,
        notes: profile.notes,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
    };
};

export const getOrCreateCommanderProfile = async (user) => {
    let profile = await CommanderProfile.findOne({ user: user._id });

    if (!profile) {
        profile = await CommanderProfile.create({
            user: user._id,
            responsibility: "مسؤول شؤون الطلاب",
            permissionsScope: "department",
        });
    }

    return {
        commander: formatUserBasicData(user),
        rank: profile.rank,
        department: profile.department,
        responsibility: profile.responsibility,
        permissionsScope: profile.permissionsScope,
        notes: profile.notes,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
    };
};

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildArabicFlexibleRegex = (value) => {
    const arabicGroups = {
        ا: "[اأإآٱ]",
        أ: "[اأإآٱ]",
        إ: "[اأإآٱ]",
        آ: "[اأإآٱ]",
        ٱ: "[اأإآٱ]",

        ي: "[يىئ]",
        ى: "[يىئ]",
        ئ: "[يىئ]",

        ه: "[هة]",
        ة: "[هة]",

        و: "[وؤ]",
        ؤ: "[وؤ]",
    };

    return value
        .split("")
        .map((char) => arabicGroups[char] || escapeRegex(char))
        .join("");
};

export const searchStudentsForCommander = async ({ search = "" }) => {
    const trimmedSearch = search.trim();

    const query = {
        role: "student",
    };

    if (trimmedSearch) {
        const flexibleArabicText = buildArabicFlexibleRegex(trimmedSearch);

        // Search names from the beginning only:
        // "احمد" finds "أحمد محمد علي"
        // "محمد" does not find "أحمد محمد علي"
        // "ي" finds names that start with ي only
        const nameStartsWithRegex = new RegExp(
            `^${flexibleArabicText}`,
            "i"
        );

        // For militaryId, email, and phone we still allow contains search
        const normalContainsRegex = new RegExp(
            escapeRegex(trimmedSearch),
            "i"
        );

        query.$or = [
            { name: nameStartsWithRegex },
            { email: normalContainsRegex },
            { militaryId: normalContainsRegex },
            { phoneNumber: normalContainsRegex },
        ];
    }

    const students = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(50);

    return students.map((student) => formatUserBasicData(student));
};

export const getStudentProfileSummaryForCommander = async (studentId) => {
    const student = await User.findOne({
        _id: studentId,
        role: "student",
    }).select("-password");

    if (!student) {
        const err = new Error("Student not found");
        err.statusCode = 404;
        throw err;
    }

    const profile = await getOrCreateStudentProfile(student);

    return {
        ...profile,
        summary: {
            behaviorGrade: profile.grades.behavior,
            absenceDays: profile.attendance.absenceDays,
            status: profile.status,
        },
    };
};