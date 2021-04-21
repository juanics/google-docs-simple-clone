import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { io } from 'socket.io-client';

const toolbar = [
	[{ header: [1, 2, 3, 4, 5, 6, false] }],
	[{ font: [] }],
	[{ size: ['small', false, 'large', 'huge'] }],
	['bold', 'italic', 'underline', 'strike'],
	[{ list: 'ordered' }, { list: 'bullet' }],
	[{ script: 'sub' }, { script: 'super' }],
	[{ indent: '-1' }, { indent: '+1' }], // outdent/indent
	[{ direction: 'rtl' }],
	[{ color: [] }, { background: [] }],
	['image', 'blockquote', 'code-block'],
	['clean'],
];

const Editor = () => {
   const {id: documentId} = useParams();
	const [socket, setSocket] = useState();
	const [quill, setQuill] = useState();

	//connect to the socket
	useEffect(() => {
		const s = io('http://localhost:4242');
		setSocket(s);
		return () => {
			s.disconnect();
		};
	}, []);

	//detect changes on the editor
	useEffect(() => {
		if (socket == null || quill == null) return;

		const handleTextChange = (delta, oldDelta, source) => {
			if (source !== 'user') return;
			socket.emit('send-changes', delta);
		};

		quill.on('text-change', handleTextChange);

		return () => {
			quill.off('text-change', handleTextChange);
		};
	}, [socket, quill]);

	//receiving changes
	useEffect(() => {
		if (socket == null || quill == null) return;

		const handler = (delta) => {
			quill.updateContents(delta);
		};

      socket.on('receive-changes', handler);

		return () => {
			socket.off('receive-changes', handler);
		};
	}, [socket, quill]);

   //handling multiple documents 
   useEffect(() => {
		if (socket == null || quill == null) return;

		socket.once('load-document', document => {
         quill.enable();
         quill.setContents(document);
      });

		socket.emit('get-document', documentId);
	}, [socket, quill, documentId]);

   //saving the data to mongodb
   useEffect(() => {
      if (socket == null || quill == null) return;

      const interval = setInterval(() => {
         socket.emit('save-document', quill.getContents());
      }, 2000);

      return () => {
         clearInterval(interval);
      }
   })

	const wrapperRef = useCallback((wrapper) => {
		if (!wrapper) return;
		wrapper.innerHTML = '';
		const editor = document.createElement('div');
		wrapper.append(editor);
		const q = new Quill(editor, {
			theme: 'snow',
			modules: {
				toolbar,
			},
		});

		setQuill(q);
      q.disable();
      q.setText('loading...');
	}, []);

	return <div className="container" ref={wrapperRef}></div>;
};

export default Editor;
