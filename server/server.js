const mongoose = require('mongoose');
const Document = require('./Document');
require('dotenv').config();

try {
	// Connect to the MongoDB cluster
	const url = process.env.DB_URL;
	mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: true }, () =>
		console.log(' Mongoose is connected')
	);
} catch (e) {
	console.log('could not connect', e);
}

const io = require('socket.io')(4242, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
});

io.on('connection', (socket) => {
	console.log('connected');

	socket.on('get-document', async (documentId) => {
		const document = await findOrCreateDocument(documentId);

		socket.join(documentId);
		socket.emit('load-document', document.data);

		socket.on('send-changes', (delta) => {
			socket.broadcast.to(documentId).emit('receive-changes', delta);
		});

		socket.on('save-document', async (data) => {
			await Document.findByIdAndUpdate(documentId, { data }).catch((e) => console.log(e));
		});
	});
});

const findOrCreateDocument = async (id) => {
	if (id == null) return;

	const document = await Document.findById(id);
	if (document) return document;
	return await Document.create({ _id: id, data: `<p style: color="#666">Welcome to docs!</p>` }).catch((e) =>
		console.log(e)
	);
};
