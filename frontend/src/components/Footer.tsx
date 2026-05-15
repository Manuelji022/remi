import './footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer>
      <p>&copy; {year} Developed by Manuelji. All rights reserved.</p>
    </footer>
  )
}
