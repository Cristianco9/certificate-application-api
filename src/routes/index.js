// Import the Router class from Express
import { Router } from "express";

// Import the Services Routes for handle services related-routes
import authenticationRouter from "./authenticationRouter.js";
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
import certificateRouter from "./certificateRouter.js";
import phoneRouter from "./phoneRouter.js";
import userPhoneRouter from "./userPhoneRouter.js";
import institutionPhoneRouter from "./institutionPhoneRouter.js";
import studentPhoneRouter from "./studentPhoneRouter.js";
import certificateRecipientPhoneRouter from "./certificateRecipientPhoneRouter.js";
import certificateSignatureRouter from './certificateSignatureRouter.js';
import certificateEnrollmentRouter from './certificateEnrollmentRouter.js';



// Function to set up API routes
const routerApi = (api) => {

  // Create a new Router instance
  const router = Router();

  // Use the router instance for the '/api/v1' path
  api.use('/api/v1', router);

  // Catalog of the sub-routes
  router.use('/auth', authenticationRouter);
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
  router.use('/certificates', certificateRouter);
  router.use('/phones', phoneRouter);
  router.use('/user-phones', userPhoneRouter);
  router.use('/institution-phones', institutionPhoneRouter);
  router.use('/student-phones', studentPhoneRouter);
  router.use('/certificate-recipient-phones', certificateRecipientPhoneRouter);
  router.use('/certificate-signatures', certificateSignatureRouter);
  router.use('/certificate-enrollments', certificateEnrollmentRouter);
}

// Export the routerApi function for use in other parts of the application
export default routerApi;
