from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support import expected_conditions as EC
import urllib2
import os
import time
import json


def baseUrl(url):
    base = os.getenv('BASE_URL')
    if(base is None):
        base = "http://localhost:5000"
    return base + url


def whichDriver():
    driverName = os.getenv('DRIVER')
    return driverName


def secondDriver():
    driverName = os.getenv('DRIVER')
    if driverName == 'IE':
        secondDriver = webdriver.Firefox()
    elif driverName == 'REMOTEIE':
        remote = os.getenv('REMOTE_EXECUTOR')
        if remote is None:
            remote = 'http://10.8.0.14:5555/wd/hub'
        secondDriver = webdriver.Remote(command_executor=remote, desired_capabilities=DesiredCapabilities.FIREFOX)
    else:
        secondDriver = driver()
    return secondDriver


def driver():
    driverName = os.getenv('DRIVER')
    if driverName is None:
        driverName = 'FIREFOX'

    remote = os.getenv('REMOTE_EXECUTOR')
    if remote is None:
        remote = 'http://0.0.0.0:5555/wd/hub'

    if driverName == 'FIREFOX':
        print('Using local Firefox')
        driver = webdriver.Firefox()

    elif driverName == 'IE':
        print('Using local IE')
        driver = webdriver.IE()

    elif driverName == 'PHANTOMJS':
        print('Using local PhantomJS')
        driver = webdriver.PhantomJS()

    elif driverName == 'CHROME':
        e2edir = os.path.dirname(os.path.abspath(__file__))
        driver = webdriver.Chrome(e2edir + '/../chromedriver/chromedriver')

    elif driverName == 'REMOTECHROME':
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=DesiredCapabilities.CHROME)

    elif driverName == 'REMOTEIE':
        print('Using remote IE')
        ie = {'platform': 'WINDOWS 8',
              'browserName': 'internet explorer',
              'version': '10',
              'javascriptEnabled': True,
              'ignoreZoomSetting': True}
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=ie)

    elif driverName == 'REMOTEFIREFOX':
        print('Using remote Firefox')
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=DesiredCapabilities.FIREFOX)

    elif driverName == 'REMOTEANDROID':
        print('Using remote android')
        caps = webdriver.DesiredCapabilities.ANDROID
        caps['platform'] = "Linux"
        caps['version'] = "4.0"
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=caps)

    driver.delete_all_cookies()
    driver.implicitly_wait(30)

    driver.get(baseUrl("/logout"))

    driver.delete_all_cookies()

    return driver


def resetData(driver):
    driver.get(baseUrl('/testdata/reset'))


def existingUserlogin(driver, usernameValue, passwordValue):
    driver.get(baseUrl("/x"))

    WebDriverWait(driver, 10).until(EC.visibility_of_element_located((By.ID, 'button-existing-users-login'))).click()

    login = WebDriverWait(driver, 10).until(EC.visibility_of_element_located((By.CLASS_NAME, 'login-content')))
    WebDriverWait(login, 10).until(EC.visibility_of_element_located((By.ID, 'email'))).send_keys(usernameValue)
    WebDriverWait(login, 10).until(EC.visibility_of_element_located((By.ID, 'password'))).send_keys(passwordValue)

    driver.find_element_by_id('signin-button').click()

    WebDriverWait(driver, 10).until(EC.visibility_of_element_located((By.CSS_SELECTOR, 'header, #mini-left-menu')))


def signup(driver):
    driver.get(baseUrl("/logout"))
    username = getJSON('/testdata/newUser').get('username')
    existingUserlogin(driver, username+'@troupetest.local', 'password')

    return username

def signupWithNewTroupe(driver):
    driver.get(baseUrl("/logout"))
    userJSON = getJSON('/testdata/newUser')
    username = userJSON.get('username')
    id = userJSON.get('_id')
    getJSON('/testdata/newTroupeForUser?id='+id)
    # time.sleep(5)
    existingUserlogin(driver, username+'@troupetest.local', 'password')

    return username


def screenshot(driver):
    e2edir = os.path.dirname(os.path.abspath(__file__))
    filename = os.path.abspath(e2edir + '/../../../output/screenshot-' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime()) + '.png')
    driver.get_screenshot_as_file(filename)


def getJSON(url):
    response = urllib2.urlopen(baseUrl(url)).read()
    return json.loads(response)


def read_url(url):
    response = urllib2.urlopen(url)
    return response.read()

# Keys sometimes need to be sent one at a time (firefox),
# especially when the page is responding to the event, otherwise the full string will not go through
def send_keys(element, str):
    for c in str:
        element.send_keys(c)


# first delete what text is there,
# then use send_keys
def set_text(element, str):
    element.clear()
    send_keys(element, str)


def showLeftMenu(driver):
    # show left menu
    action = ActionChains(driver)
    action.move_to_element(driver.find_element_by_css_selector('#left-menu-hotspot'))
    action.click(driver.find_element_by_css_selector('#left-menu-hotspot'))
    action.perform()
    #assert(driver.find_element_by_css_selector(".trpLeftMenuToolbar").is_displayed())
    #time.sleep(1)


# cannot run during setup/teardown as stdout is ignored
def printJobInfo(driver):
    remote = os.getenv('REMOTE_EXECUTOR')
    if remote is not None:
        if 'saucelabs' in remote:
            print("Link to your job: https://saucelabs.com/jobs/%s" % driver.session_id)


def shutdown(driver):
    if(os.getenv('SELENIUM_DEV') is None):
        screenshot(driver)
        driver.quit()
