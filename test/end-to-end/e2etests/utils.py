from selenium import webdriver


def baseUrl(url):
    return "http://localhost:5000/" + url


def driver():
    #driver = webdriver.Firefox()
    driver = webdriver.PhantomJS()
    driver.delete_all_cookies()
    driver.implicitly_wait(30)
    return driver


def existingUserlogin(driver, usernameValue, passwordValue):
    driver.get(baseUrl("x"))
    existingButton = driver.find_element_by_css_selector("#button-existing-users-login")
    existingButton.click()

    name = driver.find_element_by_css_selector('#email')
    name.send_keys(usernameValue)

    password = driver.find_element_by_css_selector('#password')
    password.send_keys(passwordValue)

    driver.find_element_by_css_selector('#signin-button').click()
    driver.find_element_by_css_selector('DIV.trpHeaderTitle')
