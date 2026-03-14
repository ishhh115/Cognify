import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please provide a title for the quiz']
        trim: true
    },
    fileName: {
        type: String,
        required: [true, 'Please provide the file name of the document']
    },
    filePath: {
        type: String,
        required: [true, 'Please provide the file path of the document']
    },
    fileSize: { 
        type: Number,
        required: [true, 'Please provide the file size of the document']
    },
    extractedText: {
        type: String,
        default: ''
    },
    chunks: [
        {
            content: {
                type: String,
                required: [true, 'Please provide the content of the chunk']
            },  
            pageNumber: {
                type: Number,
                default: 0
            },
            chunkIndex: {
                type: Number,
                required: [true, 'Please provide the index of the chunk']
            }
        }],
        uploadDate: {
            type: Date,
            default: Date.now
        },
        lastAccessed: {
            type: Date,
            default: Date.now
        },
        status: {   
            type: String,
            enum: ['processing', 'ready', 'error'],
            default: 'processing'
        }
}, {
    timestamps: true
});

//Index for faster queries
documentSchema.index({ userId: 1, uploadData: -1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;