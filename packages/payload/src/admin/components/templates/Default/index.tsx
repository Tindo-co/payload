import React from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../../utilities/Config/index.js';
import DefaultNav from '../../elements/Nav/index.js';
import RenderCustomComponent from '../../utilities/RenderCustomComponent/index.js';
import Meta from '../../utilities/Meta/index.js';
import { Props } from './types.js';

import './index.scss';

const baseClass = 'template-default';

const Default: React.FC<Props> = ({ children, className }) => {
  const {
    admin: {
      components: {
        Nav: CustomNav,
      } = {
        Nav: undefined,
      },
    } = {},
  } = useConfig();
  const { t } = useTranslation('general');

  const classes = [
    baseClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <Meta
        title={t('dashboard')}
        description={`${t('dashboard')} Payload`}
        keywords={`${t('dashboard')}, Payload`}
      />
      <RenderCustomComponent
        DefaultComponent={DefaultNav}
        CustomComponent={CustomNav}
      />
      <div className={`${baseClass}__wrap`}>
        {children}
      </div>
    </div>
  );
};

export default Default;