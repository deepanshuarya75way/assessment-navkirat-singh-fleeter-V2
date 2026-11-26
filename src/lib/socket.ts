import {io, Socket} from "socket.io-client"

let socket : Socket|null=null
export const getSocket = () => {
	if (!socket){
		console.log("Socket Url = ", process.env.NEXT_PUBLIC_SOCKET_SERVER_URL);
		
	socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL)
	}
	return socket
}