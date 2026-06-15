import excuseRouter from './routes/excuse.routes.js';

console.log('Excuse router (debug):', excuseRouter.stack ? excuseRouter.stack.map(r => r.route && r.route.path) : []);
