import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SupportPage.css';

const resources = [
  {
    name: 'National Suicide Prevention Lifeline',
    phone: '1-800-273-8255',
    url: 'https://suicidepreventionlifeline.org/',
    description: '24/7, free and confidential support for people in distress.'
  },
  {
    name: 'Crisis Text Line',
    phone: 'Text HOME to 741741',
    url: 'https://www.crisistextline.org/',
    description: 'Text-based support for those in crisis, available 24/7.'
  },
  {
    name: 'SAMHSA National Helpline',
    phone: '1-800-662-HELP (4357)',
    url: 'https://www.samhsa.gov/find-help/national-helpline',
    description: 'Confidential free help, from public health agency, for mental health or substance use.'
  },
  {
    name: 'Trevor Project (LGBTQ+)',
    phone: '1-866-488-7386',
    url: 'https://www.thetrevorproject.org/',
    description: 'Crisis intervention and suicide prevention for LGBTQ+ youth.'
  },
  {
    name: 'Trans Lifeline',
    phone: '1-877-565-8860',
    url: 'https://translifeline.org/',
    description: 'Peer support for trans people, by trans people.'
  }
];

const SupportPage = () => {
  const navigate = useNavigate();
  return (
    <main className="support-main" role="main">
      <div className="support-card">
        <div className="back-navigation">
          <Link to="/options" className="back-link" aria-label="Back to options">
            <span className="back-icon">&#8592;</span> back
          </Link>
        </div>
        <h1 className="support-title">Crisis Support Resources</h1>
        <p className="support-intro">if you are in crisis, please reach out to one of the resources below. you are not alone.</p>
        <ul className="support-list">
          {resources.map((res) => (
            <li key={res.name} className="support-resource">
              <h2 className="support-resource-name">{res.name}</h2>
              <p className="support-resource-desc">{res.description}</p>
              <p className="support-resource-contact">
                <strong>Phone:</strong> {res.phone}<br />
                <a href={res.url} target="_blank" rel="noopener noreferrer" className="support-link">Visit Website</a>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};

export default SupportPage; 