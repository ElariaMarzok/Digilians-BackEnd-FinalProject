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

export const searchStudentsForCommander = async ({ search = "" }) => {
    const trimmedSearch = search.trim();

    const query = {
        role: "student",
    };

    if (trimmedSearch) {
        query.$or = [
            { name: { $regex: trimmedSearch, $options: "i" } },
            { email: { $regex: trimmedSearch, $options: "i" } },
            { militaryId: { $regex: trimmedSearch, $options: "i" } },
            { phoneNumber: { $regex: trimmedSearch, $options: "i" } },
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