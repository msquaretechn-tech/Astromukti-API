import app from "./app.js";
import connectDB from "./config/db.config.js";
import dotenv from "dotenv";
import os from 'os';
import cluster from "cluster";
import { registerJobs } from "./jobs/index.js";
dotenv.config();

const port = process.env.PORT;

connectDB()
    .then(() => {
        // if (cluster.isPrimary) {
        //     console.log(os.cpus().length);

        //     for (let index = 0; index < os.cpus().length; index++) {
        //         cluster.fork();
        //     }
        // } else {
        app.listen(process.env.PORT, () => {
            console.log(` ⚙️  Server is running at port : http://localhost:${port} Process Id : ${process.pid}`);
            registerJobs();
        })
        // }
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!! ", err);
    })



// STEP 1 -> Check token/regid is present or not
// STEP 2 -> If token/regid is present get data of user
// STEP 3 -> If user data present then show home else login