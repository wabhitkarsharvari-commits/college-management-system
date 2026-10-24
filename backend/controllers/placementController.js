
const { readAll, modify, newId } = require('../utils/fileDb');
const { cleanString, missingFields, httpError } = require('../utils/validators');

function parseDrive(body) {
  const missing = missingFields(body, [
    'company',
    'role',
    'location',
    'deadline',
  ]);

  if (missing.length > 0) {
    throw httpError(400, `Please fill in: ${missing.join(', ')}.`);
  }

  const minCgpa =
    body.minCgpa === '' || body.minCgpa == null
      ? 0
      : Number(body.minCgpa);

  if (!Number.isFinite(minCgpa) || minCgpa < 0 || minCgpa > 10) {
    throw httpError(400, 'Minimum CGPA must be between 0 and 10.');
  }

  return {
    company: cleanString(body.company, 100),
    role: cleanString(body.role, 100),
    location: cleanString(body.location, 100),
    deadline: cleanString(body.deadline, 30),
    minCgpa,
    description: cleanString(body.description || '', 2000),
    status: body.status === 'closed' ? 'closed' : 'active',
  };
}

async function list(req, res, next) {
  try {
    const drives = await readAll('placementDrives');
    res.json({ drives });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = parseDrive(req.body || {});

    const drive = await modify('placementDrives', (drives) => {
      const record = {
        id: newId('plc'),
        ...data,
        createdAt: new Date().toISOString(),
      };

      drives.push(record);
      return record;
    });

    res.status(201).json({ drive });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = parseDrive(req.body || {});

    const drive = await modify('placementDrives', (drives) => {
      const record = drives.find((item) => item.id === req.params.id);

      if (!record) {
        throw httpError(404, 'Placement drive not found.');
      }

      Object.assign(record, data);
      return record;
    });

    res.json({ drive });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await modify('placementDrives', (drives) => {
      const index = drives.findIndex((item) => item.id === req.params.id);

      if (index === -1) {
        throw httpError(404, 'Placement drive not found.');
      }

      drives.splice(index, 1);
    });

    res.json({ message: 'Placement drive deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
