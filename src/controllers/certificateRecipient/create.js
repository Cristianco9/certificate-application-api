import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to create a new certificate recipient.
 *
 * The service implements an idempotent "upsert-by-identity" flow:
 *
 *   - If no recipient with the submitted documentNumber exists → a new
 *     record is inserted and the service returns 'CREATED SUCCESSFULLY'.
 *
 *   - If a recipient with the same documentNumber already exists AND its
 *     critical identification fields (firstName, lastName,
 *     documentTypeId, documentNumber, relationship) match the incoming
 *     payload → the existing record's address is refreshed (and a legacy
 *     NULL relationship backfilled), and the service returns
 *     'UPDATED SUCCESSFULLY'. This is a NORMAL, EXPECTED outcome: the
 *     same person can return to request additional certificates.
 *
 * Both outcomes are successes and must produce a response. Before this
 * controller was fixed, the 'UPDATED SUCCESSFULLY' branch was missing,
 * so the request never resolved and the client hung indefinitely.
 *
 * A 409 from the service means the documentNumber exists but the
 * identity does NOT match — a real data-entry conflict the operator
 * must resolve. It is passed through Boom untouched and becomes a 409
 * on the wire.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body.
 * @param {string} req.body.firstName - Recipient's first name.
 * @param {string} [req.body.middleName] - Recipient's middle name (optional).
 * @param {string} req.body.lastName - Recipient's first surname.
 * @param {string} [req.body.secondLastName] - Recipient's second surname (optional).
 * @param {number|string} req.body.documentTypeId - Document type identifier.
 * @param {string} req.body.documentNumber - Recipient's document number.
 * @param {string} req.body.relationship - Relationship to the student.
 * @param {string} req.body.address - Recipient's address.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the operation result and the rotated token.
 */
export const createOneCertificateRecipient = async (req, res, next) => {
  const newCertificateRecipient = {
    firstName: req.body.firstName,
    middleName: req.body.middleName,
    lastName: req.body.lastName,
    secondLastName: req.body.secondLastName,
    documentTypeId: req.body.documentTypeId,
    documentNumber: req.body.documentNumber,
    // 'relationship' is part of the same-person critical field set the
    // service compares. It MUST be forwarded or the identity check
    // degrades to a wildcard match.
    relationship: req.body.relationship,
    address: req.body.address,
  };

  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const response = await certificateRecipientManager.createOne(newCertificateRecipient);

    // ── Path A — a new recipient was inserted ──────────────────────
    if (response.status === 'CREATED SUCCESSFULLY') {
      return res.status(201).json({
        success: true,
        message: 'Receptor del certificado creado exitosamente',
        authentication: res.locals.newUserToken,
      });
    }

    // ── Path B — same person, already stored; address refreshed ────
    // Returning 200 here (not 201) signals "no new resource created,
    // existing one touched". Both are `ok` on the frontend's side.
    if (response.status === 'UPDATED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Receptor del certificado registrado exitosamente',
        authentication: res.locals.newUserToken,
      });
    }

    // ── Defensive — the service returned a status this controller
    // doesn't know. Fail loudly instead of silently hanging the request.
    throw Boom.internal('Unexpected service status', {
      code: 'CERTIFICATE_RECIPIENT_UNEXPECTED_STATUS',
      status: response.status,
    });
  } catch (error) {
    // CertificateRecipientServices already throws boomified errors
    // (conflict on identity mismatch, notFound on missing document type,
    // badRequest on malformed input); boomify() passes those through
    // untouched and only defaults genuinely unexpected errors to a 500.
    const boomError = Boom.boomify(error, {
      message: 'No es posible crear el receptor del certificado en la base de datos',
    });
    next(boomError);
  }
};
