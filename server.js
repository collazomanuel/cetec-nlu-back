import dotenv  from "dotenv"
import path from 'path';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({path:__dirname+'/.env'});

const url = process.env.MONGO_URL;

import express from "express";
import mongoose from "mongoose";
import nluRouter from "./routes/NLURoutes.js";
import cors from 'cors';

import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.js";

import session from 'express-session';

import MongoStore from 'connect-mongo';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import './config/database.js';
import docente from './models/users.js';
import Strategy from 'passport-google-oauth2';
const GoogleStrategy = Strategy;

// tuve que agregar esto para que no salte la warning de abajo:
// DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.
mongoose.set('useCreateIndex', true);

const app = express();
app.use(cookieParser());

// set the view engine to ejs
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(cors());
// TODO: Revisar si hace falta
app.use(express.json());

//Middleware sesssion persists in Mongo
app.use(session({
  store: MongoStore.create({ 
    mongoUrl: `${process.env.MONGO_URL}`,
    ttl: 60 * 10
  }),
  secret: 'secreto',
  resave: true,
  saveUninitialized: true,
}))


app.use(passport.initialize()) // init passport on every route call
app.use(passport.session())    //allow passport to use "express-session"

//Get the GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from Google Developer Console
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET


//Use "GoogleStrategy" as the Authentication Strategy
passport.use(new GoogleStrategy({
  clientID:     GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:8080/auth/google/callback",
  passReqToCallback   : true
},
(request, accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));


passport.serializeUser( async (user, done) => { 
  console.log(`\n--------> Serialize User:`)
  console.log(user)

  //TODO: cambiar
  if (!await docente.findOne({email: user.email})){
    await docente.create({email:user.email});
   }
   // The USER object is the "authenticated user" from the done() in authUser function.
   // serializeUser() will attach this user to "req.session.passport.user.{user}", so that it is tied to the session object for each session.  

  done(null, user)
} )

passport.deserializeUser((user, done) => {
  console.log("\n--------- Deserialized User:")
  console.log(user)
  // This is the {user} that was saved in req.session.passport.user.{user} in the serializationUser()
  // deserializeUser will attach this {user} to the "req.user.{user}", so that it can be used anywhere in the App.

  done (null, user)
}) 



//solo poner useNewUrlParser y useUnifiedTopology porque las otras están deprecadas
const conn = mongoose.createConnection(
  url, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true //hay que agregar esto para que sea único el nombre
  }
);

//si la base de datos no existe Mongo la crea
app.use(nluRouter);

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
  console.log(`Servidor escuchando en: http://localhost:${PORT}`);
});



/*
//Define the Logout
app.post("/logout", (req,res) => {
    req.logOut()
    res.redirect("/login")
    console.log(`-------> User Logged out`)
})
*/