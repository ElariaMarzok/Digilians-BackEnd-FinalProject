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