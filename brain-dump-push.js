/**
 * brain-dump-push.js — April 1 2026 brain dump session
 * Auto-runs once on page load, pushes all initiatives + sub-projects to Railway.
 * Remove this file after successful push.
 */
(async function () {
  const BASE = 'https://super-connector-api-production.up.railway.app';
  const KEY  = window.SC_API_KEY || 'sc_live_k3y_2026_scak';
  const hdrs = { 'Content-Type': 'application/json', 'X-API-Key': KEY };

  const ts = () => Date.now();

  async function post(path, body) {
    const r = await fetch(BASE + path, { method: 'POST', headers: hdrs, body: JSON.stringify(body) });
    return r.json();
  }

  const initiatives = [
    {
      initiative_name: 'Phoebe Daily Digest',
      venture: 'Cross-venture',
      goal: 'Change Phoebe digest from Mon/Thu cadence to every day, first thing in inbox each morning.',
      status: 'Brain Dump',
      priority: 'High',
      phoebe_cadence: 'Daily',
      notes: 'Update GAS trigger schedule in Phoebe agent script.'
    },
    {
      initiative_name: "Katherine's App",
      venture: 'ReRev Labs',
      goal: 'Build and deliver the app for Katherine.',
      status: 'Brain Dump',
      priority: 'Critical',
      notes: 'Needs to happen soon. ReRev project.'
    },
    {
      initiative_name: 'High Quality Activators — Newsletter Onboarding System',
      venture: 'ReRev Labs',
      goal: 'Build segmented email list with a 3-day onboarding sprint introducing the org. Separate email/subdomain per audience lane.',
      status: 'Brain Dump',
      priority: 'High',
      notes: 'Two lanes: (1) automation advocates, (2) entrepreneurial ecosystem advocates (lunch & learns, webinars, curriculum design).',
      sub_projects: [
        { sub_project_name: 'Segmentation Lane: Automation Advocates', description: 'Identify and onboard contacts best suited as advocates for ReRev automation services.', status: 'Not Started', priority: 'High' },
        { sub_project_name: 'Segmentation Lane: Entrepreneurial Ecosystem Advocates', description: 'Identify and onboard contacts for lunch & learns, webinars, and curriculum design audiences.', status: 'Not Started', priority: 'High' }
      ]
    },
    {
      initiative_name: 'Karimi F. — Informational Interview Campaign',
      venture: 'ReRev Labs',
      goal: 'Help Karimi find high-quality 30-minute informational interviews with well-matched organizations.',
      status: 'Brain Dump',
      priority: 'Medium',
      notes: 'Karimi is based in South Africa, diverse experience, looking for full-time work. Key warm path: Zach from Google Ventures (met summer 2025). Ask him for good-fit org referrals for informational interviews.',
      sub_projects: [
        { sub_project_name: 'Outreach to Zach @ Google Ventures re: Karimi', description: 'Warm outreach to Zach asking if he knows orgs in his network that would be a good fit for a 30-min informational interview with Karimi.', status: 'Not Started', priority: 'High' }
      ]
    },
    {
      initiative_name: 'ReRev Cold Email Campaign — Automation Services, Marketing Industry',
      venture: 'ReRev Labs',
      goal: 'Launch a cold email campaign targeting the marketing industry focused on automation services. Subdomain landing page + Facebook ad budget.',
      status: 'Brain Dump',
      priority: 'High',
      notes: 'Blocked on new website launch. Also need to gather FB ad feedback from network first.',
      sub_projects: [
        { sub_project_name: 'FB Ad Feedback — Network Outreach', description: 'Identify contacts in network with Facebook ad campaign experience. Get high-level feedback before launch.', status: 'Not Started', priority: 'Medium' },
        { sub_project_name: 'Subdomain Landing Page Build', description: 'Build dedicated landing page on subdomain for the cold email campaign targeting marketing industry.', status: 'Not Started', priority: 'High' }
      ]
    },
    {
      initiative_name: 'ReRev New Website',
      venture: 'ReRev Labs',
      goal: 'Launch updated ReRev website with stronger use case section and explicit automation focus.',
      status: 'Brain Dump',
      priority: 'High',
      notes: 'Biggest piece is the use case section. SXSW mentor gave direct email and is a warm lead for a marketing automation chat — does not need to wait for site launch to reach out.',
      sub_projects: [
        { sub_project_name: 'Use Case Section — Automation Focus', description: 'Write and design use case section with explicit focus on automation offerings.', status: 'Not Started', priority: 'High' },
        { sub_project_name: 'SXSW Mentor Outreach', description: 'Reach out to SXSW mentor directly re: marketing automation chat. Contact info to be logged when available.', status: 'Not Started', priority: 'High' }
      ]
    },
    {
      initiative_name: 'Pixels Offering Campaign',
      venture: 'ReRev Labs',
      goal: 'Create a dedicated campaign around the Pixels offering — one of ReRev\'s strongest offerings that has not gotten enough attention.',
      status: 'Brain Dump',
      priority: 'Medium',
      notes: 'Has not gotten any love. Needs dedicated initiative and campaign plan.'
    },
    {
      initiative_name: 'Monthly ReRev Webinars',
      venture: 'ReRev Labs',
      goal: 'Establish a consistent monthly webinar cadence under the ReRev brand.',
      status: 'Brain Dump',
      priority: 'High',
      notes: 'Each webinar is its own sub-project including planning, execution, and post-mortem review.',
      sub_projects: [
        { sub_project_name: 'Next Webinar — Planning', description: 'Plan the next ReRev webinar. Define topic, format, date, and promotion strategy.', status: 'Not Started', priority: 'High' }
      ]
    },
    {
      initiative_name: 'New Career Project — Substack',
      venture: 'Personal',
      goal: 'Post consistently on the New Career Project substack. Has not been posted to in 1+ month.',
      status: 'Brain Dump',
      priority: 'High',
      notes: 'Needs to be a higher priority. More consistent posting cadence required.'
    },
    {
      initiative_name: 'Martha — Athlete Web Design Site',
      venture: 'Martha',
      goal: 'Help Martha conceive and build the athlete web design site (teen and collegiate athletes). Current site is poor quality.',
      status: 'Brain Dump',
      priority: 'Medium',
      notes: 'Using Variant.com to explore better site options. Need to conceive the full project from scratch alongside Martha.'
    },
    {
      initiative_name: 'Prismm Content Intelligence — Information Feeding Plan',
      venture: 'Prismm',
      goal: 'Build a structured plan to feed fresh, relevant information into the Prismm content intelligence GAS tool. Current info is static and overwhelming.',
      status: 'Brain Dump',
      priority: 'High',
      notes: 'Solution: pull public bank investor/earnings calls from banks that most closely match the Prismm ICP (non-publicly-listed banks $250M-$2B). Build an insight report from those calls to feed into the tool.',
      sub_projects: [
        { sub_project_name: 'Bank Earnings Call Research + Insight Report', description: 'Pull public earnings calls/investor calls from banks closest to Prismm ICP. Analyze priorities and pain points. Build a structured report to feed into the content tool.', status: 'Not Started', priority: 'High' }
      ]
    },
    {
      initiative_name: 'Proactive Super Connections Feature',
      venture: 'ReRev Labs',
      goal: 'Build a system that actively works on behalf of a designated contact to surface the best warm introductions Keyona should make for them.',
      status: 'Brain Dump',
      priority: 'Critical',
      notes: 'Permanent "Active Advocacy Bucket" on the contacts page. Keyona adds a contact, system scans full contact book and recommends who to introduce them to + what the ask is (activation angle). Output surfaces on the contact\'s profile page. Entry via Google Form. Human stays in the loop — Keyona makes intros on her own time. First use case: Karimi informational interview campaign.',
      sub_projects: [
        { sub_project_name: 'Active Advocacy Bucket — Railway + UI', description: 'Add active_advocacy boolean field to Railway contact schema. Surface as a persistent bucket in the Contacts dashboard.', status: 'Not Started', priority: 'Critical' },
        { sub_project_name: 'Google Form — Advocacy Intake', description: 'Build Google Form for adding a contact to the Active Advocacy Bucket. Form feeds contact details and goal into the system.', status: 'Not Started', priority: 'High' },
        { sub_project_name: 'Recommendation Engine — Match + Activation Angle', description: 'Build logic that scans full contact book, matches against the advocacy contact\'s goal, and surfaces top intro candidates with activation angle.', status: 'Not Started', priority: 'Critical' }
      ]
    },
    {
      initiative_name: 'LinkedIn Network Import System',
      venture: 'ReRev Labs',
      goal: 'Build a system to ingest LinkedIn connections CSVs from trusted colleagues. Imported contacts live in the same Railway contacts table tagged with imported_via (source contact ID).',
      status: 'Brain Dump',
      priority: 'High',
      notes: 'imported_via field = provenance/relationship chain, not enrichment status. Multi-value if same person appears in multiple colleague exports (overlap signal). Key use cases: expand contact pool for Super Connector matching, overlap detection across colleague networks, warm path finding for advocacy targets (e.g. Karimi job search). 5-10 colleagues identified who would share their CSV today if asked.',
      sub_projects: [
        { sub_project_name: 'Add imported_via field to Railway contact schema', description: 'Schema change: add imported_via field (contact ID of source colleague, with display name fallback) to Railway contacts table. Multi-value support for overlap detection.', status: 'Not Started', priority: 'High' },
        { sub_project_name: 'CSV Intake + Mapping Pipeline', description: 'Build pipeline to ingest LinkedIn connections CSV (First Name, Last Name, Email, Company, Position, Connected On), map to Railway contact schema, tag with imported_via, push via bulk endpoint.', status: 'Not Started', priority: 'High' },
        { sub_project_name: 'Overlap Detection Logic', description: 'Build logic to detect contacts appearing in multiple colleague CSVs. Surface overlap count on contact profile as warm path signal.', status: 'Not Started', priority: 'Medium' }
      ]
    },
    {
      initiative_name: 'Tool Registry Migration to Railway',
      venture: 'Internal',
      goal: 'Migrate Tool Registry from Google Sheets to Railway for better integration.',
      status: 'Brain Dump',
      priority: 'Low',
      notes: 'Future sprint. Current GAS sheet (~30 entries) is fine for now. Also consider GitHub as an alternative. Main concern is token usage but not significant at current scale.'
    }
  ];

  console.log('[BrainDump] Starting push of', initiatives.length, 'initiatives...');
  const results = [];

  for (const ini of initiatives) {
    const subs = ini.sub_projects || [];
    delete ini.sub_projects;
    ini.initiative_id = 'INI-' + ts() + Math.floor(Math.random() * 999);

    try {
      const res = await post('/initiative', ini);
      const iniId = res.initiative_id || ini.initiative_id;
      console.log('[BrainDump] ✓ Initiative:', ini.initiative_name, '→', iniId);
      results.push({ name: ini.initiative_name, id: iniId, status: 'ok', subs: [] });

      for (const sub of subs) {
        sub.initiative_id = iniId;
        sub.sub_project_id = 'SUB-' + ts() + Math.floor(Math.random() * 999);
        try {
          const sr = await post('/sub-project', sub);
          console.log('[BrainDump]   ✓ Sub-project:', sub.sub_project_name);
          results[results.length - 1].subs.push({ name: sub.sub_project_name, status: 'ok' });
        } catch (e) {
          console.error('[BrainDump]   ✗ Sub-project failed:', sub.sub_project_name, e);
          results[results.length - 1].subs.push({ name: sub.sub_project_name, status: 'error', error: e.message });
        }
        await new Promise(r => setTimeout(r, 150));
      }
    } catch (e) {
      console.error('[BrainDump] ✗ Initiative failed:', ini.initiative_name, e);
      results.push({ name: ini.initiative_name, status: 'error', error: e.message });
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('[BrainDump] Complete.', JSON.stringify(results, null, 2));
  window._brainDumpResults = results;
})();
