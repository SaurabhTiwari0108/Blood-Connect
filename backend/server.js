// ============================================
// Import Required Modules
// ============================================
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ============================================
// Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*',
    credentials: true
}));

// Add request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
});

// ============================================
// MongoDB Connection
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bloodconnect';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============================================
// User Schema
// ============================================
const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    bloodGroup: {
        type: String,
        required: [true, 'Blood group is required'],
        enum: {
            values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
            message: '{VALUE} is not a valid blood group'
        }
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [18, 'Age must be at least 18'],
        max: [65, 'Age must be less than 65']
    },
    userType: {
        type: String,
        required: [true, 'User type is required'],
        enum: {
            values: ['donor', 'receiver', 'admin'],
            message: '{VALUE} is not a valid user type'
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastDonationDate: {
        type: Date,
        default: null
    },
    donationCount: {
        type: Number,
        default: 0
    },
    receivedCount: {
        type: Number,
        default: 0
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    premiumExpiry: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update timestamp on modification
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const User = mongoose.model('User', userSchema);

// ============================================
// Seed Admin User
// ============================================
async function seedAdmin() {
    try {
        const adminExists = await User.findOne({ userType: 'admin' });
        if (!adminExists) {
            console.log('No admin found. Creating default admin...');
            const defaultAdmin = new User({
                fullName: 'System Admin',
                email: 'admin@bloodconnect.com',
                password: 'admin123',
                phone: '0000000000',
                bloodGroup: 'O+',
                city: 'System',
                age: 30,
                userType: 'admin'
            });
            await defaultAdmin.save();
            console.log('✅ Default admin created: admin@bloodconnect.com / admin123');
        }
    } catch (error) {
        console.error('Error seeding admin:', error);
    }
}
seedAdmin();

// ============================================
// Blood Bank Schema & Seed
// ============================================
const bloodBankSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    availableBloodGroups: [{ type: String }],
    contactPerson: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const BloodBank = mongoose.model('BloodBank', bloodBankSchema);

async function seedBloodBanks() {
    try {
        const count = await BloodBank.countDocuments();
        if (count === 0) {
            console.log('Seeding dummy blood banks...');
            const dummyBanks = [
                { name: 'Red Cross Blood Bank', city: 'Mumbai', address: 'Bandra West, Mumbai', phone: '9876543210', availableBloodGroups: ['A+', 'O+', 'B+', 'AB+'], contactPerson: 'Dr. Sharma' },
                { name: 'LifeLine City Blood Center', city: 'Mumbai', address: 'Andheri East, Mumbai', phone: '9876543211', availableBloodGroups: ['O-', 'A-', 'B-', 'AB-'], contactPerson: 'Dr. Verma' },
                { name: 'Sanjeevani Blood Bank', city: 'Delhi', address: 'Connaught Place, Delhi', phone: '9876543212', availableBloodGroups: ['O+', 'B+', 'A+'], contactPerson: 'Dr. Gupta' },
                { name: 'Apollo Blood Reserve', city: 'Delhi', address: 'South Ex, Delhi', phone: '9876543213', availableBloodGroups: ['A-', 'O-', 'B+'], contactPerson: 'Dr. Singh' },
                { name: 'Care Hospital Blood Bank', city: 'Pune', address: 'Viman Nagar, Pune', phone: '9876543214', availableBloodGroups: ['A+', 'O+', 'B+', 'AB+', 'O-'], contactPerson: 'Dr. Patil' }
            ];
            await BloodBank.insertMany(dummyBanks);
            console.log('✅ Dummy blood banks seeded successfully.');
        }
    } catch (error) {
        console.error('Error seeding blood banks:', error);
    }
}
seedBloodBanks();

// ============================================
// Donation Request Schema
// ============================================
const donationRequestSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bloodGroup: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    unitsNeeded: {
        type: Number,
        required: true,
        min: 1
    },
    urgency: {
        type: String,
        required: true,
        enum: ['critical', 'urgent', 'normal']
    },
    hospitalName: {
        type: String,
        required: true
    },
    hospitalAddress: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        required: true
    },
    patientName: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    completionCode: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'fulfilled', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const DonationRequest = mongoose.model('DonationRequest', donationRequestSchema);

// ============================================
// Donation History Schema
// ============================================
const donationHistorySchema = new mongoose.Schema({
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    donationDate: {
        type: Date,
        default: Date.now
    },
    hospitalName: {
        type: String,
        required: true
    },
    hospitalAddress: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    unitsDonated: {
        type: Number,
        default: 1,
        min: 1
    },
    bloodGroup: {
        type: String,
        required: true
    },
    certificateNumber: {
        type: String,
        unique: true
    },
    status: {
        type: String,
        enum: ['completed', 'verified', 'pending'],
        default: 'completed'
    },
    patientName: {
        type: String
    },
    patientPhone: {
        type: String
    },
    notes: {
        type: String
    }
});

const DonationHistory = mongoose.model('DonationHistory', donationHistorySchema);

// ============================================
// API Routes
// ============================================

// Health Check
app.get(['/', '/api'], (req, res) => {
    res.json({ 
        message: 'BloodConnect API is running',
        status: 'OK',
        timestamp: new Date()
    });
});

// ============================================
// User Registration - FIXED
// ============================================
app.post('/api/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        
        const { fullName, email, password, phone, bloodGroup, city, age, userType } = req.body;

        // Detailed validation with specific error messages
        if (!fullName || fullName.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Full name is required' 
            });
        }

        if (!email || email.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Email is required' 
            });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({ 
                success: false,
                message: 'Password must be at least 8 characters' 
            });
        }

        if (!phone || phone.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Phone number is required' 
            });
        }

        if (!bloodGroup) {
            return res.status(400).json({ 
                success: false,
                message: 'Blood group is required' 
            });
        }

        if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid blood group' 
            });
        }

        if (!city || city.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'City is required' 
            });
        }

        if (!age || age < 18 || age > 65) {
            return res.status(400).json({ 
                success: false,
                message: 'Age must be between 18 and 65' 
            });
        }

        if (!userType) {
            return res.status(400).json({ 
                success: false,
                message: 'User type is required' 
            });
        }

        if (!['donor', 'receiver', 'admin'].includes(userType)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid user type. Must be donor, receiver, or admin' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'User with this email already exists' 
            });
        }

        // Create new user
        const newUser = new User({
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            password: password,
            phone: phone.trim(),
            bloodGroup: bloodGroup,
            city: city.trim(),
            age: parseInt(age),
            userType: userType
        });

        console.log('Attempting to save user:', {
            fullName: newUser.fullName,
            email: newUser.email,
            userType: newUser.userType
        });

        await newUser.save();

        console.log('User saved successfully:', newUser._id);

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email, userType: newUser.userType },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: newUser._id,
                    fullName: newUser.fullName,
                    email: newUser.email,
                    phone: newUser.phone,
                    bloodGroup: newUser.bloodGroup,
                    city: newUser.city,
                    age: newUser.age,
                    userType: newUser.userType
                },
                token
            }
        });

    } catch (error) {
        console.error('Registration Error:', error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                success: false,
                message: messages.join(', '),
                error: error.message 
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false,
                message: 'Email already registered',
                error: error.message 
            });
        }

        res.status(500).json({ 
            success: false,
            message: 'Server error during registration',
            error: error.message 
        });
    }
});

// ============================================
// User Login
// ============================================
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;

        console.log('Login attempt:', { email, userType });

        if (!email || !password || !userType) {
            return res.status(400).json({ 
                success: false,
                message: 'Email, password and user type are required' 
            });
        }

        const user = await User.findOne({ 
            email: email.toLowerCase().trim(), 
            userType: userType 
        });
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials or user type' 
            });
        }

        if (!user.isActive) {
            return res.status(403).json({ 
                success: false,
                message: 'Your account has been deactivated' 
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, userType: user.userType },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    bloodGroup: user.bloodGroup,
                    city: user.city,
                    age: user.age,
                    userType: user.userType,
                    donationCount: user.donationCount
                },
                token
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login',
            error: error.message 
        });
    }
});

// ============================================
// Get All Donors
// ============================================
app.get('/api/donors', async (req, res) => {
    try {
        const { bloodGroup, city } = req.query;
        
        let filter = { userType: 'donor', isActive: true };
        
        if (bloodGroup) filter.bloodGroup = bloodGroup;
        if (city) filter.city = new RegExp(city, 'i');

        const donors = await User.find(filter)
            .select('-password')
            .sort({ donationCount: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: donors.length,
            data: donors
        });

    } catch (error) {
        console.error('Error fetching donors:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching donors',
            error: error.message 
        });
    }
});

// ============================================
// Create Donation Request
// ============================================
app.post('/api/donation-requests', async (req, res) => {
    try {
        const { 
            requesterId, bloodGroup, unitsNeeded, urgency, 
            hospitalName, hospitalAddress, city, contactNumber, 
            patientName, reason 
        } = req.body;

        const newRequest = new DonationRequest({
            requesterId,
            bloodGroup,
            unitsNeeded,
            urgency,
            hospitalName,
            hospitalAddress,
            city,
            contactNumber,
            patientName,
            reason
        });

        await newRequest.save();

        res.status(201).json({
            success: true,
            message: 'Donation request created successfully',
            data: newRequest
        });

    } catch (error) {
        console.error('Error creating donation request:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error creating donation request',
            error: error.message 
        });
    }
});

// ============================================
// Get All Donation Requests
// ============================================
app.get('/api/donation-requests', async (req, res) => {
    try {
        const { status, bloodGroup, city } = req.query;
        
        let filter = {};
        if (status) filter.status = status;
        if (bloodGroup) filter.bloodGroup = bloodGroup;
        if (city) filter.city = new RegExp(city, 'i');

        const requests = await DonationRequest.find(filter)
            .populate('requesterId', 'fullName phone email')
            .populate('acceptedBy', 'fullName phone email city bloodGroup donationCount')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });

    } catch (error) {
        console.error('Error fetching donation requests:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching donation requests',
            error: error.message 
        });
    }
});

// ============================================
// Accept Donation Request
// ============================================
app.post('/api/donation-requests/:id/accept', async (req, res) => {
    try {
        const { donorId } = req.body;
        
        if (!donorId) {
            return res.status(400).json({ success: false, message: 'Donor ID is required' });
        }

        const request = await DonationRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        
        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is no longer pending' });
        }

        // Generate a 6-digit random code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        request.status = 'accepted';
        request.acceptedBy = donorId;
        request.completionCode = code;

        await request.save();

        res.status(200).json({
            success: true,
            message: 'Request accepted successfully',
            data: request
        });

    } catch (error) {
        console.error('Error accepting request:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error accepting request',
            error: error.message 
        });
    }
});

// ============================================
// Complete Donation Request
// ============================================
app.post('/api/donation-requests/:id/complete', async (req, res) => {
    try {
        const { donorId, completionCode } = req.body;
        
        if (!donorId || !completionCode) {
            return res.status(400).json({ success: false, message: 'Donor ID and Completion Code are required' });
        }

        const request = await DonationRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        
        if (request.status !== 'accepted') {
            return res.status(400).json({ success: false, message: 'Request is not in accepted state' });
        }

        if (request.acceptedBy.toString() !== donorId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to complete this request' });
        }

        if (request.completionCode !== completionCode) {
            return res.status(400).json({ success: false, message: 'Invalid completion code' });
        }

        request.status = 'fulfilled';
        await request.save();

        // Increment donor points
        await User.findByIdAndUpdate(donorId, {
            $inc: { donationCount: request.unitsNeeded },
            lastDonationDate: new Date()
        });

        // Increment receiver points
        if (request.requesterId) {
            await User.findByIdAndUpdate(request.requesterId, {
                $inc: { receivedCount: request.unitsNeeded }
            });
        }

        // Add to donation history automatically
        const donation = new DonationHistory({
            donorId,
            hospitalName: request.hospitalName,
            hospitalAddress: request.hospitalAddress,
            city: request.city,
            unitsDonated: request.unitsNeeded,
            bloodGroup: request.bloodGroup,
            patientName: request.patientName,
            patientPhone: request.contactNumber,
            notes: `Donated for patient ${request.patientName} via BloodConnect Request`,
            certificateNumber: `BC${Date.now()}${Math.floor(Math.random() * 1000)}`
        });
        await donation.save();

        res.status(200).json({
            success: true,
            message: 'Donation completed successfully',
            data: request
        });

    } catch (error) {
        console.error('Error completing request:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error completing request',
            error: error.message 
        });
    }
});

// ============================================
// Get User Profile
// ============================================
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching user',
            error: error.message 
        });
    }
});

// ============================================
// Update User Profile
// ============================================
app.put('/api/users/:id', async (req, res) => {
    try {
        const { fullName, phone, city, age } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { fullName, phone, city, age },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error updating user',
            error: error.message 
        });
    }
});

// ============================================
// Get Donation History
// ============================================
app.get('/api/donations/history/:donorId', async (req, res) => {
    try {
        const history = await DonationHistory.find({ donorId: req.params.donorId })
            .sort({ donationDate: -1 })
            .limit(20);

        res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });

    } catch (error) {
        console.error('Error fetching donation history:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching donation history',
            error: error.message 
        });
    }
});

// ============================================
// Add Donation Record
// ============================================
app.post('/api/donations/add', async (req, res) => {
    try {
        const { donorId, hospitalName, hospitalAddress, city, units, bloodGroup, notes } = req.body;

        const donation = new DonationHistory({
            donorId,
            hospitalName,
            hospitalAddress,
            city,
            unitsDonated: units || 1,
            bloodGroup,
            notes,
            certificateNumber: `BC${Date.now()}${Math.floor(Math.random() * 1000)}`
        });

        await donation.save();

        await User.findByIdAndUpdate(donorId, {
            $inc: { donationCount: 1 },
            lastDonationDate: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Donation recorded successfully',
            data: donation
        });

    } catch (error) {
        console.error('Error adding donation:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error recording donation',
            error: error.message 
        });
    }
});

// ============================================
// Get Statistics
// ============================================
app.get('/api/stats', async (req, res) => {
    try {
        const totalDonors = await User.countDocuments({ userType: 'donor' });
        const totalReceivers = await User.countDocuments({ userType: 'receiver' });
        const totalRequests = await DonationRequest.countDocuments();
        const pendingRequests = await DonationRequest.countDocuments({ status: 'pending' });
        const fulfilledRequests = await DonationRequest.countDocuments({ status: 'fulfilled' });

        res.status(200).json({
            success: true,
            data: {
                totalDonors,
                totalReceivers,
                totalRequests,
                pendingRequests,
                fulfilledRequests,
                totalUsers: totalDonors + totalReceivers
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching statistics',
            error: error.message 
        });
    }
});

// ============================================
// Admin APIs
// ============================================

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const query = req.query.userType ? { userType: req.query.userType } : {};
        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// Delete user by ID
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// Delete donation request by ID
app.delete('/api/donation-requests/:id', async (req, res) => {
    try {
        const request = await DonationRequest.findByIdAndDelete(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        res.json({ success: true, message: 'Request deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// Admin Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalDonors = await User.countDocuments({ userType: 'donor' });
        const totalReceivers = await User.countDocuments({ userType: 'receiver' });
        const totalRequests = await DonationRequest.countDocuments();
        const fulfilledRequests = await DonationRequest.countDocuments({ status: 'fulfilled' });

        res.json({
            success: true,
            data: {
                totalDonors,
                totalReceivers,
                totalRequests,
                fulfilledRequests
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// ============================================
// Premium & Blood Bank APIs
// ============================================

// Upgrade User to Premium
app.post('/api/users/:id/upgrade', async (req, res) => {
    try {
        const userId = req.params.id;
        const { planId } = req.body; // e.g., 'monthly', 'yearly'
        
        let monthsToAdd = planId === 'yearly' ? 12 : 1;
        
        let expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd);

        const user = await User.findByIdAndUpdate(userId, {
            isPremium: true,
            premiumExpiry: expiryDate
        }, { new: true }).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'Upgraded to Premium successfully', data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// Get Blood Banks (Filtered by city, expects premium user check in frontend)
app.get('/api/bloodbanks', async (req, res) => {
    try {
        const city = req.query.city;
        const query = city ? { city: { $regex: new RegExp(`^${city}$`, 'i') } } : {};
        const bloodBanks = await BloodBank.find(query).sort({ createdAt: -1 });
        res.json({ success: true, data: bloodBanks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// ============================================
// Start Server
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔗 API URL: http://localhost:${PORT}`);
    console.log(`📝 Test the API at: http://localhost:${PORT}/`);
});

// DELETE USER - ONLY FOR TESTING
app.delete('/api/users/email/:email', async (req, res) => {
    try {
        const result = await User.deleteOne({ email: req.params.email.toLowerCase() });
        res.json({ 
            success: true, 
            message: 'User deleted',
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Export the Express API
module.exports = app;