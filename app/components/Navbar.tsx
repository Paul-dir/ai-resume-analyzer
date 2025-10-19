import { Link } from "react-router-dom";

const Navbar = (): JSX.Element => {
    return (
        <nav className="navbar">
            <Link to="/">
                <p className="text-2xl font-bold text-gardient">RESUMIND</p>
            </Link>
            <Link to="/upload" className="primary-button w-fit">
                Upload Resume
            </Link>

        </nav>
    );
};

export default Navbar;
