import '../styles/globals.css';
import Agendador from '../components/Agendador';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Agendador />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp; 