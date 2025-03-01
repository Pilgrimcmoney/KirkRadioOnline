import asyncio
import websockets
import json
from mixxx_controller import MixxxController

class WebSocketServer:
    def __init__(self):
        self.mixxx_controller = MixxxController()

    async def handle_message(self, websocket, message):
        try:
            data = json.loads(message)
            command = data.get('command')
            params = data.get('params', {})

            response = self.process_command(command, params)
            await websocket.send(json.dumps(response))
        except Exception as e:
            await websocket.send(json.dumps({'error': str(e)}))

    def process_command(self, command, params):
        if command == 'load_track':
            return self.mixxx_controller.load_track(params['deck'])
        elif command == 'play':
            return self.mixxx_controller.play(params['deck'])
        elif command == 'pause':
            return self.mixxx_controller.pause(params['deck'])
        # Add more command handlers
        else:
            return {'error': 'Unknown command'}

    async def server(self, websocket, path):
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            print("Client disconnected")

    def start_server(self):
        start_server = websockets.serve(self.server, "localhost", 8765)
        asyncio.get_event_loop().run_until_complete(start_server)
        asyncio.get_event_loop().run_forever()

if __name__ == "__main__":
    server = WebSocketServer()
    server.start_server()
