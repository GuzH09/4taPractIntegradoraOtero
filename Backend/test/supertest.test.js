import chai from 'chai'
import supertest from 'supertest'

const expect = chai.expect
const requester = supertest('http://localhost:8080')

// Registrarse
// Registrarse de nuevo con el mismo email (Error)
// Loggear
// Acceder a un endpoint privado
// Acceder a un endpoint privado (Error - Admin)
// Debería usar una coleccion de prueba para los tests pero por simplicidad estoy usando la original

describe('Test de integración de Login, Register y Logout', function () {
  before(function () {})
  beforeEach(function () { this.timeout = 3000 })
  after(function () {})
  afterEach(function () {})

  const testUser = {
    first_name: 'Testing',
    last_name: 'User',
    email: 'testuser@test.com',
    age: 18,
    password: 'testing1234'
  }
  let cookie

  // Lista de tests
  it('POST /register debe retornar un success al registrar un nuevo usuario', async function () {
    const { statusCode, ok, _body } = await requester.post('/api/sessions/register').send(testUser)

    expect(statusCode).to.equal(200)
    expect(ok).to.equal(true)
    expect(_body.success).to.equal('User added.')
  })

  it('POST /register debe retornar un error al registrar un usuario con el mismo email', async function () {
    const { statusCode, ok, _body } = await requester.post('/api/sessions/register').send(testUser)

    expect(statusCode).to.equal(400)
    expect(ok).to.equal(false)
    expect(_body).to.have.property('error')
  })

  it('POST /login con los datos registrados debe retornar un status code 200 y una cookie valida', async function () {
    const result = await requester.post('/api/sessions/login').send({
      email: testUser.email,
      password: testUser.password
    })
    const cookieResult = result.headers['set-cookie'][0]
    expect(cookieResult).to.be.ok
    cookie = {
      name: cookieResult.split('=')[0],
      value: cookieResult.split('=')[1]
    }
    expect(result.statusCode).to.equal(200)
    expect(cookie.name).to.be.ok.and.eql('auth')
    expect(cookie.value).to.be.ok
  })

  it('GET /current con la cookie obtenida debe ser enviada y retornada la informacion correctamente', async function () {
    const { _body } = await requester.get('/api/sessions/current').set('Cookie', [`${cookie.name}=${cookie.value}`])
    expect(_body.user).to.have.property('_id')
  })

  it('POST /products debe retornar Unauthorized porque el usuario no es admin', async function () {
    const mockProduct = {
      title: 'Test Product',
      description: 'Test Product',
      code: '123TEST',
      price: '1500',
      stock: '10',
      category: 'TESTPRODUCT'
    }
    const { statusCode, ok, _body } = await requester.post('/api/products/').set('Cookie', [`${cookie.name}=${cookie.value}`]).send(mockProduct)

    expect(statusCode).to.equal(403)
    expect(ok).to.equal(false)
    expect(_body.message).to.equal('Unauthorized')
  })
})
