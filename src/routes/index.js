// Import the Router class from Express
import { Router } from "express";

// Import the Services Routes for handle services related-routes
import academicLevelRouter from "./academicLevelRouter.js";
import genderRouter from "./genderRouter.js";
import roleRouter from "./roleRouter.js";
import countryRouter from "./countryRouter.js";
import departmentRouter from "./departmentRouter.js";
import municipalityRouter from "./municipalityRouter.js";
import documentTypeRouter from "./documentTypeRouter.js";
import gradeRouter from "./gradeRouter.js";
import institutionRouter from "./institutionRouter.js";
import groupRouter from "./groupRouter.js";
import subjectRouter from "./subjectRouter.js";
import studentRouter from "./studentRouter.js";
import enrollmentRouter from "./enrollmentRouter.js";
import userRouter from "./userRouter.js";
import certificateRecipientRouter from "./certificateRecipient.js";
import scoreRouter from "./scoreRouter.js";
import phoneRouter from "./phoneRouter.js";



// Function to set up API routes
const routerApi = (app) => {

  // Create a new Router instance
  const router = Router();

  // Use the router instance for the '/app/v1' path
  app.use('/app/v1', router);

  // Catalog of the sub-routes
  router.use('/academic-levels', academicLevelRouter);
  router.use('/genders', genderRouter);
  router.use('/roles', roleRouter);
  router.use('/countries', countryRouter);
  router.use('/departments', departmentRouter);
  router.use('/municipalities', municipalityRouter);
  router.use('/document-types', documentTypeRouter);
  router.use('/grades', gradeRouter);
  router.use('/institutions', institutionRouter);
  router.use('/groups', groupRouter);
  router.use('/subjects', subjectRouter);
  router.use('/students', studentRouter);
  router.use('/enrollments', enrollmentRouter);
  router.use('/users', userRouter);
  router.use('/certificate-recipients', certificateRecipientRouter);
  router.use('/scores', scoreRouter);
  router.use('/phones', phoneRouter);
}

// Export the routerApi function for use in other parts of the application
export default routerApi;
