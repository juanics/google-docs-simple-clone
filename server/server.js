const mongoose = require('mongoose');
const Document = require('./Document');

try {
	// Connect to the MongoDB cluster
	mongoose.connect(
		`mongodb+srv://m001-student:manya123@sandbox.5h8ci.mongodb.net/google-docs-simple-clone-db?retryWrites=true&w=majority`,
		{ useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: true },
		() => console.log(' Mongoose is connected')
	);
} catch (e) {
	console.log('could not connect');
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
	return await Document.create({ _id: id, data: `<p style: color="#666">Welcome to docs!</p>` }).catch((e) => console.log(e));
};
