const mongoose = require("mongoose");

const userDataSchema = new mongoose.Schema(
    {
        id: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        gender: { type: String, required: true },
        gender_probability: { type: Number, required: true },
        sample_size: { type: Number, required: true },
        age: { type: Number, required: true },
        age_group: { type: String, required: true },
        country_id: { type: String, required: true },
        country_probability: { type: Number, required: true }
    },{
        versionKey: false,
        toJSON: {
            transform(_doc, rec) {
                delete rec.__v;
                delete rec._id; 
                delete rec.updatedAt;
                return rec; 
            }
        },
        timestamps: { createdAt: 'created_at' }
    }
);

const userData = mongoose.model("UserData", userDataSchema);
module.exports = userData;