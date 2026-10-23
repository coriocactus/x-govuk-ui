import type { TreeNode } from "x-govuk-ui";

/*
 * GOV.UK's live ministerial departments, each with the agencies and public bodies it sponsors, and
 * theirs, as GOV.UK's organisations API lists them. `bun run departments` writes the list. Each line
 * is an organisation's slug, its name and its abbreviation, if it has one, indented two spaces for
 * each level.
 *
 * Source: GOV.UK, under the Open Government Licence v3.0.
 */
const listed = `
attorney-generals-office | Attorney General's Office | AGO
  government-legal-department | Government Legal Department | GLD
    bona-vacantia | Bona Vacantia | BVD
  serious-fraud-office | Serious Fraud Office | SFO
cabinet-office | Cabinet Office
  advisory-committee-on-business-appointments | Advisory Committee on Business Appointments | ACOBA
  cabinet-office-board | Cabinet Office Board
  civil-service | Civil Service
    government-analysis-function | Government Analysis Function
    civil-service-government-communication-service | Government Communication Service | GCS
    government-debt-management-function | Government Debt Management Function | GDMF
    civil-service-government-economic-service | Government Economic Service | GES
    government-finance-function | Government Finance Function | GFF
    government-geography-profession | Government Geography Profession
    civil-service-government-knowledge-information-management-profession | Government Knowledge & Information Management Profession
    civil-service-government-legal-profession | Government Legal Profession | GLP
    civil-service-government-occupational-psychology-profession | Government Occupational Psychology Profession
    civil-service-government-planning-inspectors | Government Planning Inspectors
    civil-service-the-government-planning-profession | Government Planning Profession
    government-project-delivery | Government Project Delivery
    civil-service-government-science-engineering | Government Science & Engineering Profession | GSE Profession
    government-security-profession | Government Security Profession
    civil-service-government-social-research-profession | Government Social Research Profession
    civil-service-government-tax-profession | Government Tax Profession
    civil-service-government-veterinary-services | Government Veterinary Services
    civil-service-intelligence-analysis-profession | Intelligence Analysis
    civil-service-internal-audit-profession | Internal Audit Profession
    civil-service-medical-profession | Medical Profession
    civil-service-operational-delivery-profession | Operational Delivery Profession
    civil-service-policy-profession | Policy Profession
  corporate-officers-of-the-house-of-commons | Corporate Officers of the House of Commons
  corporate-officers-of-the-house-of-lords | Corporate Officers of the House of Lords
  evaluation-task-force | Evaluation Task Force | ETF
  government-commercial-function | Government Commercial Function | GCF
  government-estates-management | Government Estates Management | GEM
  civil-service-government-operational-research-service | Government Operational Research Service | GORS
  government-people-function | Government People Function | GPF
  government-people-group | Government People Group | GPG
    government-recruitment-service | Government Recruitment Service | GRS
  government-property-agency | Government Property Agency | GPA
  government-property-function | Government Property Function | GPF
  government-skills | Government Skills
  independent-adviser-on-ministers-interests | Independent Adviser on Ministerial Standards
  the-infected-blood-memorial-committee | Infected Blood Memorial Committee
  leadership-college-for-government | Leadership College for Government | LCG
  modernisation-and-reform | Modernisation and Reform
  national-infrastructure-and-service-transformation-authority | National Infrastructure and Service Transformation Authority | NISTA
  national-security | National Security and Intelligence
  office-of-the-parliamentary-counsel | Office of the Parliamentary Counsel | OPC
  open-public-services | Open Public Services | OPS
  prime-ministers-office-10-downing-street | Prime Minister's Office, 10 Downing Street | Number 10
  public-sector-fraud-authority | Public Sector Fraud Authority | PSFA
  security-vetting-appeals-panel | Security Vetting Appeals Panel | SVAP
  review-body-on-senior-salaries | Senior Salaries Review Body | SSRB
  uk-commission-on-covid-commemoration | UK Commission on Covid Commemoration
  uk-integrated-security-fund | UK Integrated Security Fund | UKISF
  uk-resilience-academy | UK Resilience Academy | UKRA
  united-kingdom-security-vetting | United Kingdom Security Vetting | UKSV
department-for-business-innovation-science-and-trade | Department for Business, Innovation, Science and Trade | BIST
  british-hallmarking-council | British Hallmarking Council | BHC
  central-arbitration-committee | Central Arbitration Committee | CAC
  certification-officer | Certification Officer
  companies-house | Companies House
  competition-and-markets-authority | Competition and Markets Authority | CMA
    office-for-the-internal-market | Office for the Internal Market | OIM
    subsidy-advice-unit | Subsidy Advice Unit | SAU
  copyright-tribunal | Copyright Tribunal
  export-control-joint-unit | Export Control Joint Unit | ECJU
  fair-work-agency | Fair Work Agency | FWA
  government-chemist | Government Chemist
  government-office-for-science | Government Office for Science | GO-Science
  government-office-for-technology-transfer | Government Office for Technology Transfer | GOTT
  intellectual-property-office | Intellectual Property Office | IPO
    company-names-tribunal | Company Names Tribunal
  low-pay-commission | Low Pay Commission | LPC
  office-for-investment | Office for Investment
    office-for-investment-financial-services | Office for Investment: Financial Services | OfI:FS
  office-for-life-sciences | Office for Life Sciences | OLS
  office-for-product-safety-and-standards | Office for Product Safety and Standards
  office-for-responsible-business-conduct | Office for Responsible Business Conduct | ORBC
  office-for-the-pay-review-bodies | Office for the Pay Review Bodies | OPRB
  office-of-the-regulator-of-community-interest-companies | Office of the Regulator of Community Interest Companies | CIC Regulator
  office-of-trade-sanctions-implementation | Office of Trade Sanctions Implementation | OTSI
  regulatory-innovation-office | Regulatory Innovation Office | RIO
  regulatory-policy-committee | Regulatory Policy Committee | RPC
  research-collaboration-advice-team | Research Collaboration Advice Team | RCAT
  small-business-commissioner | Small Business Commissioner | SBC
  insolvency-service | The Insolvency Service
  trade-remedies-authority | Trade Remedies Authority
  uk-council-for-internet-safety | UK Council for Internet Safety | UKCIS
  uk-defence-and-security-exports | UK Defence and Security Exports | UKDSE
  uk-space-agency | UK Space Agency
    national-space-operations-centre | National Space Operations Centre | NSpOC
department-for-digital-culture-media-and-sport | Department for Digital, Culture, Media and Sport | DCMS
  building-digital-uk | Building Digital UK | BDUK
  government-digital-service | Government Digital Service | GDS
  office-for-digital-identities-and-attributes | Office for Digital Identities and Attributes | OfDIA
  charity-commission | The Charity Commission
  the-queen-elizabeth-memorial-committee | The Queen Elizabeth Memorial Committee | QEMC
department-for-education | Department for Education | DfE
  further-education-commissioner | Further Education Commissioner
  independent-review-mechanism | Independent Review Mechanism | IRM
  office-of-the-schools-adjudicator | Office of the Schools Adjudicator | OSA
  ofqual | Ofqual
  ofsted | Ofsted
  regional-department-for-education-dfe-directors | Regional Department for Education (DfE) Directors
  school-teachers-review-body | School Teachers' Review Body | STRB
  standards-and-testing-agency | Standards and Testing Agency | STA
  student-loans-company | Student Loans Company | SLC
  teaching-regulation-agency | Teaching Regulation Agency | TRA
department-for-energy-security-and-net-zero | Department for Energy Security and Net Zero | DESNZ
  civil-nuclear-police-authority | Civil Nuclear Police Authority | CNPA
    civil-nuclear-constabulary | Civil Nuclear Constabulary | CNC
  great-british-energy-nuclear | Great British Energy – Nuclear | GBE-N
  mining-remediation-authority | Mining Remediation Authority
  nuclear-decommissioning-authority | Nuclear Decommissioning Authority | NDA
    nuclear-restoration-services | Nuclear Restoration Services | NRS
    nuclear-waste-services | Nuclear Waste Services
    sellafield-ltd | Sellafield Ltd
  office-for-zero-emission-vehicles | Office for Zero Emission Vehicles | OZEV
  offshore-petroleum-regulator-for-environment-and-decommissioning | Offshore Petroleum Regulator for Environment and Decommissioning | OPRED
  uk-atomic-energy-authority | UK Atomic Energy Authority | UKAEA
    uk-fusion-energy | UK Fusion Energy | UKFE
department-for-environment-food-rural-affairs | Department for Environment, Food & Rural Affairs | Defra
  advisory-committee-on-releases-to-the-environment | Advisory Committee on Releases to the Environment | ACRE
  animal-and-plant-health-agency | Animal and Plant Health Agency | APHA
  centre-for-environment-fisheries-and-aquaculture-science | Centre for Environment, Fisheries and Aquaculture Science | Cefas
  science-advisory-council | Defra's Science Advisory Council | SAC
  environment-agency | Environment Agency
    flood-forecasting-centre | Flood Forecasting Centre | FFC
  flood-and-coastal-erosion-risk-management-research-and-development-programme | Flood and Coastal Erosion Risk Management Research and Development Programme | FCERM R&D Programme
  forestry-commission | Forestry Commission
  groceries-code-adjudicator | Groceries Code Adjudicator | GCA
  independent-agricultural-appeals-panel | Independent Agricultural Appeals Panel | IAAP
  marine-management-organisation | Marine Management Organisation | MMO
  natural-england | Natural England
  plant-varieties-and-seeds-tribunal | Plant Varieties and Seeds Tribunal | PVST
  rural-payments-agency | Rural Payments Agency | RPA
    british-cattle-movement-service | British Cattle Movement Service | BCMS
  veterinary-medicines-directorate | Veterinary Medicines Directorate | VMD
  veterinary-products-committee | Veterinary Products Committee | VPC
department-for-transport | Department for Transport | DfT
  air-accidents-investigation-branch | Air Accidents Investigation Branch | AAIB
  centre-for-connected-and-autonomous-vehicles | Centre for Connected and Autonomous Vehicles | CCAV
  dft-operator-limited | DfT Operator Limited | DFTO
  disabled-persons-transport-advisory-committee | Disabled Persons Transport Advisory Committee | DPTAC
  driver-and-vehicle-licensing-agency | Driver and Vehicle Licensing Agency | DVLA
  driver-and-vehicle-standards-agency | Driver and Vehicle Standards Agency | DVSA
  high-speed-two-limited | High Speed Two (HS2) Limited | HS2 Ltd
  marine-accident-investigation-branch | Marine Accident Investigation Branch | MAIB
  maritime-and-coastguard-agency | Maritime and Coastguard Agency | MCA
  rail-accident-investigation-branch | Rail Accident Investigation Branch | RAIB
  traffic-commissioners | Traffic Commissioners for Great Britain
department-for-work-pensions | Department for Work and Pensions | DWP
  independent-case-examiner | Independent Case Examiner | ICE
  industrial-injuries-advisory-council | Industrial Injuries Advisory Council | IIAC
  skills-england | Skills England
  social-security-advisory-committee | Social Security Advisory Committee | SSAC
department-of-health-and-social-care | Department of Health and Social Care | DHSC
  administration-of-radioactive-substances-advisory-committee | Administration of Radioactive Substances Advisory Committee | ARSAC
  advisory-committee-on-clinical-impact-awards | Advisory Committee on Clinical Impact Awards | ACCIA
  commission-on-human-medicines | Commission on Human Medicines | CHM
  committee-on-mutagenicity-of-chemicals-in-food-consumer-products-and-the-environment | Committee on Mutagenicity of Chemicals in Food, Consumer Products and the Environment | COM
  independent-reconfiguration-panel | Independent Reconfiguration Panel | IRP
  medicines-and-healthcare-products-regulatory-agency | Medicines and Healthcare products Regulatory Agency | MHRA
  national-data-guardian | National Data Guardian | NDG
  nhs-pay-review-body | NHS Pay Review Body | NHSPRB
  office-for-health-improvement-and-disparities | Office for Health Improvement and Disparities | OHID
  review-body-on-doctors-and-dentists-remuneration | Review Body on Doctors' and Dentists' Remuneration | DDRB
  uk-health-security-agency | UK Health Security Agency | UKHSA
    the-centre-for-climate-health-security | Centre for Climate and Health Security | CCHS
    health-equity-in-health-protection-initiative | Health Equity in Health Protection Initiative | HEHPI
  uk-national-screening-committee | UK National Screening Committee | UK NSC
foreign-commonwealth-development-office | Foreign, Commonwealth & Development Office | FCDO
  commonwealth-scholarship-commission-in-the-uk | Commonwealth Scholarship Commission in the UK | CSC
  preventing-sexual-violence-in-conflict-initiative | Preventing Sexual Violence in Conflict Initiative | PSVI
hm-treasury | HM Treasury | HMT
  government-actuarys-department | Government Actuary's Department | GAD
  government-internal-audit-agency | Government Internal Audit Agency | GIAA
  national-wealth-fund | National Wealth Fund | NWF
  office-of-financial-sanctions-implementation | Office of Financial Sanctions Implementation | OFSI
  reclaim-fund-ltd | Reclaim Fund Ltd | RFL
  royal-mint-advisory-committee | Royal Mint Advisory Committee | RMAC
  uk-infrastructure-bank | UK Infrastructure Bank
home-office | Home Office
  accelerated-capability-environment | Accelerated Capability Environment | ACE
  advisory-council-on-the-misuse-of-drugs | Advisory Council on the Misuse of Drugs | ACMD
  animals-in-science-committee | Animals in Science Committee | ASC
  biometrics-and-surveillance-camera-commissioner | Biometrics and Surveillance Camera Commissioner | BSCC
  border-force | Border Force
  border-security-command | Border Security Command | BSC
  commission-for-countering-extremism | Commission for Countering Extremism
  disclosure-and-barring-service | Disclosure and Barring Service | DBS
  forensic-science-regulator | Forensic Science Regulator | FSR
  hm-passport-office | HM Passport Office
  immigration-advice-authority | Immigration Advice Authority | IAA
  immigration-enforcement | Immigration Enforcement
  independent-chief-inspector-of-borders-and-immigration | Independent Chief Inspector of Borders and Immigration | ICIBI
  independent-family-returns-panel | Independent Family Returns Panel | IFRP
  labour-market-evidence-group | Labour Market Evidence Group | LMEG
  migration-advisory-committee | Migration Advisory Committee | MAC
  national-crime-agency-remuneration-review-body | National Crime Agency Remuneration Review Body | NCARRB
  office-for-the-independent-examiner-of-complaints | Office for the Independent Examiner of Complaints | OIEC
  office-of-the-independent-prevent-commissioner | Office of the Independent Prevent Commissioner | OIPC
  police-advisory-board-for-england-and-wales | Police Advisory Board for England and Wales | PAB
  police-discipline-appeals-tribunal | Police Discipline Appeals Tribunal | Police Discipline
  police-remuneration-review-body | Police Remuneration Review Body | PRRB
  science-and-technology-ethics-advisory-committee | Science and Technology Ethics Advisory Committee | STEAC
  security-industry-authority | Security Industry Authority | SIA
  technical-advisory-board | Technical Advisory Board | TAB
  the-adjudicator-s-office | The Adjudicator’s Office
  uk-visas-and-immigration | UK Visas and Immigration | UKVI
ministry-of-defence | Ministry of Defence | MOD
  advisory-committee-on-conscientious-objectors | Advisory Committee on Conscientious Objectors | ACCO
  advisory-group-on-military-medicine | Advisory Group on Military and Emergency Response Medicine | AGMERM
  armed-forces-pay-review-body | Armed Forces' Pay Review Body | AFPRB
  central-advisory-committee-on-compensation | Central Advisory Committee on Compensation | CAC Compensation
  cyber-and-specialist-operations-command | Cyber & Specialist Operations Command | CSOC
  defence-equipment-and-support | Defence Equipment and Support | DE&S
  defence-infrastructure-organisation | Defence Infrastructure Organisation | DIO
  defence-nuclear-enterprise | Defence Nuclear Enterprise | DNE
  defence-nuclear-organisation | Defence Nuclear Organisation | DNO
  defence-nuclear-safety-committee | Defence Nuclear Safety Expert Committee | DNSEC
  defence-safety-authority | Defence Safety Authority | DSA
  defence-science-and-technology-laboratory | Defence Science and Technology Laboratory | Dstl
  independent-medical-expert-group | Independent Medical Expert Group | IMEG
  jhub-defence-innovation | jHub Defence Innovation
  kings-harbour-master | King's Harbour Master | KHM
  military-aviation-authority | Military Aviation Authority | MAA
  national-cyber-force | National Cyber Force | NCF
  nuclear-research-advisory-committee | Nuclear Research Advisory Committee | NRAC
  office-for-veterans-affairs | Office for Veterans' Affairs | OVA
  reserve-forces-and-cadets-associations | Reserve Forces' and Cadets' Associations (RFCA)
  submarine-delivery-agency | Submarine Delivery Agency | SDA
  oil-and-pipelines-agency | The Oil and Pipelines Agency | OPA
  uk-defence-innovation | UK Defence Innovation | UKDI
  uk-hydrographic-office | UK Hydrographic Office | UKHO
    hm-nautical-almanac-office | HM Nautical Almanac Office | HMNAO
  united-kingdom-reserve-forces-association | United Kingdom Reserve Forces Association | UKRFA
  veterans-advisory-and-pensions-committees-x13 | Veterans Advisory and Pensions Committees | VAPC
  veterans-uk | Veterans UK
ministry-of-housing-communities-local-government | Ministry of Housing, Communities and Local Government | MHCLG
  building-control-independent-panel | Building Control Independent Panel | BCIP
  building-safety-regulator | Building Safety Regulator | BSR
  disability-unit | Disability Unit
  land-registry | HM Land Registry
  homes-england | Homes England
    national-housing-bank | National Housing Bank | NHB
  land-registration-rule-committee | Land Registration Rule Committee | LRRC
  office-for-equality-and-opportunity | Office for Equality and Opportunity | OEO
  planning-inspectorate | Planning Inspectorate
  race-equality-unit | Race Equality Unit | REU
  regulator-of-social-housing | Regulator of Social Housing | RSH
  uk-holocaust-memorial-foundation | UK Holocaust Memorial Foundation | UKHMF
  windrush-commemoration-committee | Windrush Commemoration Committee
  women-and-equalities-unit | Women and Equalities Unit | WEU
ministry-of-justice | Ministry of Justice | MOJ
  academy-for-social-justice | Academy for Social Justice
  civil-procedure-rules-committee | Civil Procedure Rule Committee | CPRC
  criminal-injuries-compensation-authority | Criminal Injuries Compensation Authority | CICA
  criminal-procedure-rule-committee | Criminal Procedure Rule Committee
  family-procedure-rule-committee | Family Procedure Rule Committee | FPRC
  gov-facility-services-limited | Gov Facility Services Limited | GFSL
  hm-courts-and-tribunals-service | HM Courts & Tribunals Service | HMCTS
    administrative-court | Administrative Court
    admiralty-court | Admiralty Court
    business-and-property-division-of-the-high-court | Business and Property Division of the High Court
    commercial-circuit-court | Circuit Commercial Court
    commercial-court | Commercial Court
    companies-list | Companies List
    court-of-appeal-civil-division | Court of Appeal Civil Division
    court-of-appeal-criminal-division | Court of Appeal Criminal Division
    court-of-protection | Court of Protection | COP
    employment-appeal-tribunal | Employment Appeal Tribunal
    employment-tribunal | Employment Tribunal
    family-division-of-the-high-court | Family Division of the High Court
    first-tier-tribunal-asylum-support | First-tier Tribunal (Asylum Support)
    first-tier-tribunal-care-standards | First-tier Tribunal (Care Standards)
    first-tier-tribunal-criminal-injuries-compensation | First-tier Tribunal (Criminal Injuries Compensation)
    first-tier-tribunal-general-regulatory-chamber | First-tier Tribunal (General Regulatory Chamber)
    first-tier-tribunal-immigration-and-asylum | First-tier Tribunal (Immigration and Asylum)
    first-tier-tribunal-mental-health | First-tier Tribunal (Mental Health)
    first-tier-tribunal-property-chamber | First-tier Tribunal (Property Chamber)
    first-tier-tribunal-social-security-and-child-support | First-tier Tribunal (Social Security and Child Support)
    first-tier-tribunal-special-educational-needs-and-disability | First-tier Tribunal (Special Educational Needs and Disability)
    first-tier-tribunal-tax | First-tier Tribunal (Tax)
    first-tier-tribunal-war-pensions-and-armed-forces-compensation | First-tier Tribunal (War Pensions and Armed Forces Compensation)
    gangmasters-licensing-appeals | Gangmasters Licensing Appeals
    insolvency-list | Insolvency List
    intellectual-property-enterprise-court | Intellectual Property Enterprise Court
    kings-bench-division-of-the-high-court | King's Bench Division of the High Court
    patents-court | Patents Court
    planning-court | Planning Court
    reserve-forces-appeal-tribunal | Reserve Forces Appeal Tribunal
    senior-courts-costs-office | Senior Courts Costs Office
    technology-and-construction-court | Technology and Construction Court
    the-business-and-property-courts | The Business and Property Courts
    the-business-list | The Business List
    the-competition-list | The Competition List
    the-financial-list | The Financial List
    the-intellectual-property-list | The Intellectual Property List
    the-property-trusts-and-probate-list | The Property, Trusts and Probate List
    the-revenue-list | The Revenue List
    upper-tribunal-administrative-appeals-chamber | Upper Tribunal (Administrative Appeals Chamber)
    upper-tribunal-immigration-and-asylum-chamber | Upper Tribunal (Immigration and Asylum Chamber)
    upper-tribunal-lands-chamber | Upper Tribunal (Lands Chamber)
    upper-tribunal-tax-and-chancery-chamber | Upper Tribunal (Tax and Chancery Chamber)
  hm-prison-and-probation-service | HM Prison and Probation Service | HMPPS
    hm-prison-service | HM Prison Service | HMPS
    probation-service | Probation Service
    youth-custody-service | Youth Custody Service | YCS
  insolvency-rules-committee | Insolvency Rules Committee | IRC
  judicial-appointments-and-conduct-ombudsman | Judicial Appointments and Conduct Ombudsman | JACO
  legal-aid-agency | Legal Aid Agency | LAA
  office-of-the-public-guardian | Office of the Public Guardian | OPG
  official-solicitor-and-public-trustee | Official Solicitor and Public Trustee | OSPT
  online-procedure-rule-committee | Online Procedure Rule Committee | OPRC
  parole-board | Parole Board
  prison-services-pay-review-body | Prison Service Pay Review Body | PSPRB
  tribunal-procedure-committee | Tribunal Procedure Committee | TPC
  youth-justice-board-for-england-and-wales | Youth Justice Board for England and Wales | YJB
northern-ireland-office | Northern Ireland Office | NIO
office-of-the-advocate-general-for-scotland | Office of the Advocate General for Scotland | OAG
the-office-of-the-leader-of-the-house-of-commons | Office of the Leader of the House of Commons | OLHC
office-of-the-leader-of-the-house-of-lords | Office of the Leader of the House of Lords | OLHL
scotland-office | Scotland Office
uk-export-finance | UK Export Finance | UKEF
  export-guarantees-advisory-council | Export Guarantees Advisory Council | EGAC
wales-office | Wales Office
`;

/** The organisations as a tree, each with its abbreviation as its description. */
export const organisations: readonly TreeNode[] = (() => {
  const top: TreeNode[] = [];
  // The children of the last organisation at each depth, so an indented line joins its parent.
  const levels: TreeNode[][] = [top];
  for (const line of listed.split("\n")) {
    if (!line.trim()) continue;
    const depth = (line.length - line.trimStart().length) / 2;
    const [value = "", label = "", description] = line.trim().split(" | ");
    const children: TreeNode[] = [];
    levels[depth]?.push({ value, label, description, children });
    levels[depth + 1] = children;
  }
  // A body with no bodies of its own is a leaf.
  const prune = (nodes: TreeNode[]): TreeNode[] =>
    nodes.map(({ children, ...node }) =>
      children?.length ? { ...node, children: prune(children as TreeNode[]) } : node,
    );
  return prune(top);
})();
