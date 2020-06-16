/**
 *
 *
 * @module SelectSizes
 *
 * Created by Evgeniy Malyarov on 16.06.2020.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import Dialog from 'metadata-react/App/Dialog';
import Stepper from './Stepper';

const title = 'Размеры изделия';

class SelectSizes extends React.Component {

  constructor(props, context) {
    super(props, context);
    this.state = {step: 0};
    const dp = this.dp = $p.dp.buyers_order.create();

    props.obj.production.forEach((row) => {
      if(row.characteristic.coordinates.count()) {
        dp.production.add({
          nom: row.nom,
          characteristic: row.characteristic,
          note: row.note,
          quantity: row.quantity,
        });
      }
    });
  }

  setStep = (step) => {
    this.setState({step});
  };

  handleCalck = () => {
    $p.ui.dialogs.alert({title, text: 'Не релизовано'});
    this.props.handleClose();
  }

  render() {
    const {state: {step}, props: {obj, handleClose, sz_product, setProduct}, dp} = this;
    return <Dialog
      open
      //initFullScreen
      large
      title={title}
      onClose={handleClose}
      actions={[
        <Button
          key="ok"
          disabled={step < 1}
          onClick={this.handleCalck}
          variant="contained"
          color="primary"
        >Выполнить</Button>,
        <Button key="cancel" onClick={handleClose} color="primary">Отмена</Button>
      ]}
    >
      <Stepper step={step} setStep={this.setStep} dp={dp} obj={obj} sz_product={sz_product} setProduct={setProduct}/>
    </Dialog>;
  }
}

SelectSizes.propTypes = {
  obj: PropTypes.object,
  handleClose: PropTypes.func,
  sz_product: PropTypes.object,
  setProduct: PropTypes.func,
};

export default SelectSizes;
